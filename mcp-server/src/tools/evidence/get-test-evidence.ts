import { z } from 'zod';
import { mapWithConcurrency } from '../../lib/concurrency';
import { fetchApi } from '../../lib/request';
import { apiFailureResult, describeApiFailure } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

/**
 * How many instance reads this tool has in flight at once.
 *
 * `maxInstances` allows 25, and issuing them together was 25 `/v1` calls from
 * one tool call. Two concurrent calls of it saturated the staging ECS task in
 * the ENG-1385 load test, before `/mcp` moved to the api Lambda. Issued
 * together on the Lambda, the 25 reads would still reach the Mongo every
 * invocation shares at once, and from the published package they would be 25
 * concurrent requests to the REST API. The cap is per tool call, so concurrent
 * calls still add up. The manifest still covers every selected spec; only how
 * many are read at once changes.
 */
const MAX_CONCURRENT_INSTANCE_READS = 5;

const zodSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe(
      'The project ID. Required unless runId is provided. Used to locate the run by ciBuildId or branch.'
    ),
  runId: z
    .string()
    .optional()
    .describe(
      'The run ID to collect evidence from. When provided, projectId, ciBuildId, and branch are ignored.'
    ),
  ciBuildId: z
    .string()
    .optional()
    .describe(
      'CI build ID for exact run lookup. Requires projectId. Takes precedence over branch.'
    ),
  branch: z
    .string()
    .optional()
    .describe(
      'Git branch name. The most recent completed run on this branch is used. Requires projectId.'
    ),
  spec: z
    .string()
    .optional()
    .describe(
      'Filter spec files by substring match on the spec file path (case-insensitive).'
    ),
  testTitle: z
    .string()
    .optional()
    .describe(
      'Filter tests by substring match on the full test title, including describe blocks (case-insensitive).'
    ),
  testStatus: z
    .array(z.enum(['passed', 'failed', 'pending', 'skipped']))
    .optional()
    .describe(
      'Filter tests by status. Spec files with no tests in these statuses are left out before maxInstances applies. When omitted, all tests are included.'
    ),
  maxInstances: z
    .number()
    .int()
    .min(1)
    .max(25)
    .optional()
    .describe(
      'Maximum number of spec file instances to fetch artifacts for (default: 10, max: 25). Narrow with the spec filter instead of raising this.'
    ),
});

interface AssetRef {
  name?: string;
  attempt: number | null;
  url: string;
}

interface AttachmentRef extends AssetRef {
  filename?: string;
  contentType?: string;
}

interface TestEvidence {
  screenshots: AssetRef[];
  videos: AssetRef[];
  traces: AssetRef[];
  attachments: AttachmentRef[];
}

interface EvidenceTest {
  testId: string;
  title: string;
  status: string | null;
  evidence: TestEvidence;
}

const emptyEvidence = (): TestEvidence => ({
  screenshots: [],
  videos: [],
  traces: [],
  attachments: [],
});

type TestStatus = NonNullable<z.infer<typeof zodSchema>['testStatus']>[number];

/** The counter in a run spec's `results.stats` for each test status. */
const statsCounterByStatus: Record<TestStatus, string> = {
  passed: 'passes',
  failed: 'failures',
  pending: 'pending',
  skipped: 'skipped',
};

/**
 * Whether the spec can hold a test in one of `statuses`, read from the run
 * details. A spec that has not completed is kept when `pending` is asked for:
 * its unreported tests are pending in the instance payload, while
 * `results.stats.pending` counts only reported ones.
 */
const specHasTestsIn = (specEntry: any, statuses: TestStatus[]): boolean => {
  if (statuses.includes('pending') && !specEntry.completedAt) return true;
  const stats = specEntry.results?.stats;
  if (!stats) return false;
  return statuses.some(
    (status) => (stats[statsCounterByStatus[status]] ?? 0) > 0
  );
};

/**
 * A test's status in the instance payload. On schemaVersion 2 instances the
 * entries in results.tests can come without `state`, and the outcome is in
 * testResults, keyed by testId; without reading it the testStatus filter
 * matches no test. A test with no testResults entry has not reported, which
 * the API shows as pending (`computeTests` in @currents/mongo).
 */
const testStatusOf = (test: any, instance: any): string | null => {
  if (test.state) return test.state;
  const testResults = instance?.testResults;
  if (!testResults) return null;
  return testResults[test.testId]?.state ?? 'pending';
};

const hasEvidence = (e: TestEvidence): boolean =>
  e.screenshots.length > 0 ||
  e.videos.length > 0 ||
  e.traces.length > 0 ||
  e.attachments.length > 0;

/**
 * Groups the flat artifact arrays of an instance payload
 * (results.screenshots, results.videos, results.playwrightTraces,
 * results.attachments) by testId. Artifacts without a testId (e.g. Cypress
 * spec-level artifacts) land under the "" key.
 */
function groupArtifactsByTest(results: any): Map<string, TestEvidence> {
  const byTest = new Map<string, TestEvidence>();
  const groupFor = (testId: string | undefined): TestEvidence => {
    const key = testId ?? '';
    let group = byTest.get(key);
    if (!group) {
      group = emptyEvidence();
      byTest.set(key, group);
    }
    return group;
  };

  for (const s of results?.screenshots ?? []) {
    if (!s.screenshotURL) continue;
    groupFor(s.testId).screenshots.push({
      name: s.name ?? undefined,
      attempt: s.testAttemptIndex ?? null,
      url: s.screenshotURL,
    });
  }
  for (const v of results?.videos ?? []) {
    if (!v.videoUrl) continue;
    groupFor(v.testId).videos.push({
      attempt: v.testAttemptIndex ?? null,
      url: v.videoUrl,
    });
  }
  for (const t of results?.playwrightTraces ?? []) {
    if (!t.traceURL) continue;
    groupFor(t.testId).traces.push({
      name: t.name ?? undefined,
      attempt: t.testAttemptIndex ?? null,
      url: t.traceURL,
    });
  }
  for (const a of results?.attachments ?? []) {
    if (!a.readUrl) continue;
    groupFor(a.testId).attachments.push({
      name: a.name ?? undefined,
      filename: a.filename ?? undefined,
      contentType: a.contentType ?? undefined,
      attempt: a.testAttemptIndex ?? null,
      url: a.readUrl,
    });
  }
  return byTest;
}

const handler = async ({
  projectId,
  runId,
  ciBuildId,
  branch,
  spec,
  testTitle,
  testStatus,
  maxInstances = 10,
}: z.infer<typeof zodSchema>) => {
  const fail = (text: string) => ({
    content: [{ type: 'text' as const, text }],
  });

  if (!runId && !projectId) {
    return fail(
      'Either runId or projectId is required. Provide runId directly, or projectId with optional ciBuildId/branch to locate the run.'
    );
  }

  // Resolve the run
  let resolvedRunId = runId;
  if (!resolvedRunId) {
    const queryParams = new URLSearchParams();
    queryParams.append('projectId', projectId as string);
    if (ciBuildId) queryParams.append('ciBuildId', ciBuildId);
    else if (branch) queryParams.append('branch', branch);
    const found = await fetchApi<{ data?: { runId?: string } }>(
      `/runs/find?${queryParams.toString()}`
    );
    // A 404 is the lookup finding nothing, which the message below covers; any
    // other status is the API refusing the call and has to reach the caller.
    if (!found.ok && found.status !== 404) {
      return apiFailureResult('Failed to look up the run', found);
    }
    resolvedRunId = found.ok ? found.data.data?.runId : undefined;
    if (!resolvedRunId) {
      return fail(
        `No run found for projectId=${projectId}${
          ciBuildId ? ` ciBuildId=${ciBuildId}` : ''
        }${branch ? ` branch=${branch}` : ''}. The CI run may not have started reporting to Currents yet.`
      );
    }
  }

  const runResponse = await fetchApi<{ data?: any }>(
    `/runs/${encodeURIComponent(resolvedRunId)}`
  );
  if (!runResponse.ok) {
    return apiFailureResult(
      `Failed to retrieve run ${resolvedRunId}`,
      runResponse
    );
  }
  const run = runResponse.data.data;
  if (!run) {
    return fail(`Run ${resolvedRunId} returned no data`);
  }

  const allSpecs: any[] = run.specs ?? [];
  const specFilter = spec?.toLowerCase();
  const matchingSpecs = specFilter
    ? allSpecs.filter((s) => (s.spec ?? '').toLowerCase().includes(specFilter))
    : allSpecs;

  if (matchingSpecs.length === 0) {
    const available = allSpecs.map((s) => s.spec).join('\n');
    return fail(
      spec
        ? `No spec files matching "${spec}" in run ${resolvedRunId}. Spec files in this run:\n${available}`
        : `Run ${resolvedRunId} has no spec files.`
    );
  }

  const titleFilter = testTitle?.toLowerCase();
  const statusFilter = testStatus && testStatus.length > 0 ? testStatus : null;

  // Filter by status before the maxInstances cap: otherwise, on a run with more
  // spec files than the cap, a failed test in a spec further down the list is
  // never fetched and every returned spec has empty tests.
  const candidateSpecs = statusFilter
    ? matchingSpecs.filter((s) => specHasTestsIn(s, statusFilter))
    : matchingSpecs;

  if (candidateSpecs.length === 0) {
    return fail(
      `No ${spec ? `spec files matching "${spec}"` : 'spec files'} in run ${resolvedRunId} have tests with status ${statusFilter?.join(
        ', '
      )}.`
    );
  }

  const selectedSpecs = candidateSpecs.slice(0, maxInstances);

  logger.info(
    `Collecting evidence from run ${resolvedRunId}: ${selectedSpecs.length}/${candidateSpecs.length} spec instances`
  );

  const fetchedSpecs = await mapWithConcurrency(
    selectedSpecs,
    MAX_CONCURRENT_INSTANCE_READS,
    async (specEntry) => {
      const instanceResponse = await fetchApi<{ data?: any }>(
        `/instances/${encodeURIComponent(specEntry.instanceId)}`
      );
      // One unreadable instance leaves the other specs' evidence usable, so the
      // reason goes in this entry rather than failing the whole tool call.
      if (!instanceResponse.ok) {
        return {
          spec: specEntry.spec,
          instanceId: specEntry.instanceId,
          error: `Failed to retrieve instance data: ${describeApiFailure(
            instanceResponse
          )}`,
        };
      }
      const instance = instanceResponse.data.data;
      const results = instance?.results;
      if (!results) {
        return {
          spec: specEntry.spec,
          instanceId: specEntry.instanceId,
          error: 'Instance returned no results',
        };
      }

      const artifactsByTest = groupArtifactsByTest(results);

      const tests: EvidenceTest[] = (results.tests ?? [])
        .map((t: any): EvidenceTest => {
          const title = Array.isArray(t.title)
            ? t.title.join(' > ')
            : String(t.title ?? '');
          return {
            testId: t.testId,
            title,
            status: testStatusOf(t, instance),
            evidence: artifactsByTest.get(t.testId) ?? emptyEvidence(),
          };
        })
        .filter((t: EvidenceTest) => {
          if (titleFilter && !t.title.toLowerCase().includes(titleFilter)) {
            return false;
          }
          if (
            statusFilter &&
            (!t.status || !statusFilter.includes(t.status as any))
          ) {
            return false;
          }
          return true;
        });

      // Spec-level artifacts: Cypress spec video plus any artifact with no testId
      const specLevel = artifactsByTest.get('') ?? emptyEvidence();
      if (results.videoUrl) {
        specLevel.videos.push({ attempt: null, url: results.videoUrl });
      }

      return {
        spec: specEntry.spec,
        instanceId: specEntry.instanceId,
        tests,
        ...(hasEvidence(specLevel) ? { specLevelEvidence: specLevel } : {}),
      };
    }
  );

  // With a test filter, a spec with no matching tests only adds noise; error
  // entries stay so the caller knows a spec could not be read.
  const specs =
    titleFilter || statusFilter
      ? fetchedSpecs.filter((s) => !('tests' in s) || s.tests.length > 0)
      : fetchedSpecs;

  const manifest = {
    run: {
      runId: resolvedRunId,
      projectId: run.projectId ?? projectId,
      ciBuildId: run.meta?.ciBuildId,
      branch: run.meta?.commit?.branch,
      commitSha: run.meta?.commit?.sha,
      status: run.status,
      createdAt: run.createdAt,
      dashboardUrl: `https://app.currents.dev/run/${resolvedRunId}`,
    },
    specs,
    ...(candidateSpecs.length > selectedSpecs.length
      ? {
          truncated: `Only the first ${selectedSpecs.length} of ${candidateSpecs.length} matching spec instances were fetched. Use the spec filter to narrow down, or raise maxInstances.`,
        }
      : {}),
    note: 'Artifact URLs are signed and time-limited. Download the files promptly (e.g. with curl) rather than storing the URLs.',
  };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(manifest, null, 2),
      },
    ],
  };
};

export const getTestEvidenceTool = {
  scope: 'results:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;
