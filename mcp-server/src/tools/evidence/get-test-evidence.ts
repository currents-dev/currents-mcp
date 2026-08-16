import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe(
      "The project ID. Required unless runId is provided. Used to locate the run by ciBuildId or branch."
    ),
  runId: z
    .string()
    .optional()
    .describe(
      "The run ID to collect evidence from. When provided, projectId, ciBuildId, and branch are ignored."
    ),
  ciBuildId: z
    .string()
    .optional()
    .describe(
      "CI build ID for exact run lookup. Requires projectId. Takes precedence over branch."
    ),
  branch: z
    .string()
    .optional()
    .describe(
      "Git branch name. The most recent completed run on this branch is used. Requires projectId."
    ),
  spec: z
    .string()
    .optional()
    .describe(
      "Filter spec files by substring match on the spec file path (case-insensitive)."
    ),
  testTitle: z
    .string()
    .optional()
    .describe(
      "Filter tests by substring match on the full test title, including describe blocks (case-insensitive)."
    ),
  testStatus: z
    .array(z.enum(["passed", "failed", "pending", "skipped"]))
    .optional()
    .describe("Filter tests by status. When omitted, all tests are included."),
  maxInstances: z
    .number()
    .int()
    .min(1)
    .max(25)
    .optional()
    .describe(
      "Maximum number of spec file instances to fetch artifacts for (default: 10, max: 25). Narrow with the spec filter instead of raising this."
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
    const key = testId ?? "";
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
    content: [{ type: "text" as const, text }],
  });

  if (!runId && !projectId) {
    return fail(
      "Either runId or projectId is required. Provide runId directly, or projectId with optional ciBuildId/branch to locate the run."
    );
  }

  // Resolve the run
  let resolvedRunId = runId;
  if (!resolvedRunId) {
    const queryParams = new URLSearchParams();
    queryParams.append("projectId", projectId as string);
    if (ciBuildId) queryParams.append("ciBuildId", ciBuildId);
    else if (branch) queryParams.append("branch", branch);
    const found = await fetchApi<{ data?: { runId?: string } }>(
      `/runs/find?${queryParams.toString()}`
    );
    resolvedRunId = found?.data?.runId;
    if (!resolvedRunId) {
      return fail(
        `No run found for projectId=${projectId}${
          ciBuildId ? ` ciBuildId=${ciBuildId}` : ""
        }${branch ? ` branch=${branch}` : ""}. The CI run may not have started reporting to Currents yet.`
      );
    }
  }

  const runResponse = await fetchApi<{ data?: any }>(`/runs/${resolvedRunId}`);
  const run = runResponse?.data;
  if (!run) {
    return fail(`Failed to retrieve run ${resolvedRunId}`);
  }

  const allSpecs: any[] = run.specs ?? [];
  const specFilter = spec?.toLowerCase();
  const matchingSpecs = specFilter
    ? allSpecs.filter((s) => (s.spec ?? "").toLowerCase().includes(specFilter))
    : allSpecs;

  if (matchingSpecs.length === 0) {
    const available = allSpecs.map((s) => s.spec).join("\n");
    return fail(
      spec
        ? `No spec files matching "${spec}" in run ${resolvedRunId}. Spec files in this run:\n${available}`
        : `Run ${resolvedRunId} has no spec files.`
    );
  }

  const selectedSpecs = matchingSpecs.slice(0, maxInstances);

  logger.info(
    `Collecting evidence from run ${resolvedRunId}: ${selectedSpecs.length}/${matchingSpecs.length} spec instances`
  );

  const titleFilter = testTitle?.toLowerCase();
  const statusFilter = testStatus && testStatus.length > 0 ? testStatus : null;

  const specs = await Promise.all(
    selectedSpecs.map(async (specEntry) => {
      const instanceResponse = await fetchApi<{ data?: any }>(
        `/instances/${specEntry.instanceId}`
      );
      const results = instanceResponse?.data?.results;
      if (!results) {
        return {
          spec: specEntry.spec,
          instanceId: specEntry.instanceId,
          error: "Failed to retrieve instance data",
        };
      }

      const artifactsByTest = groupArtifactsByTest(results);

      const tests: EvidenceTest[] = (results.tests ?? [])
        .map((t: any): EvidenceTest => {
          const title = Array.isArray(t.title)
            ? t.title.join(" > ")
            : String(t.title ?? "");
          return {
            testId: t.testId,
            title,
            // InstanceTest V2 entries carry no state
            status: t.state ?? null,
            evidence: artifactsByTest.get(t.testId) ?? emptyEvidence(),
          };
        })
        .filter((t: EvidenceTest) => {
          if (titleFilter && !t.title.toLowerCase().includes(titleFilter)) {
            return false;
          }
          if (statusFilter && (!t.status || !statusFilter.includes(t.status as any))) {
            return false;
          }
          return true;
        });

      // Spec-level artifacts: Cypress spec video plus any artifact with no testId
      const specLevel = artifactsByTest.get("") ?? emptyEvidence();
      if (results.videoUrl) {
        specLevel.videos.push({ attempt: null, url: results.videoUrl });
      }

      return {
        spec: specEntry.spec,
        instanceId: specEntry.instanceId,
        tests,
        ...(hasEvidence(specLevel) ? { specLevelEvidence: specLevel } : {}),
      };
    })
  );

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
    ...(matchingSpecs.length > selectedSpecs.length
      ? {
          truncated: `Only the first ${selectedSpecs.length} of ${matchingSpecs.length} matching spec instances were fetched. Use the spec filter to narrow down, or raise maxInstances.`,
        }
      : {}),
    note: "Artifact URLs are signed and time-limited. Download the files promptly (e.g. with curl) rather than storing the URLs.",
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(manifest, null, 2),
      },
    ],
  };
};

export const getTestEvidenceTool = {
  schema: zodSchema,
  handler,
};
