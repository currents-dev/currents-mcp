import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as request from '../../lib/request';
import { getTestEvidenceTool } from './get-test-evidence';

vi.mock('../../lib/request');

const runPayload = {
  data: {
    runId: 'run-1',
    projectId: 'p1',
    createdAt: '2026-08-01T00:00:00Z',
    status: 'PASSED',
    meta: {
      ciBuildId: 'build-42',
      commit: { branch: 'feature-x', sha: 'abc123' },
    },
    specs: [
      { instanceId: 'inst-1', spec: 'e2e/checkout.spec.ts' },
      { instanceId: 'inst-2', spec: 'e2e/login.spec.ts' },
    ],
  },
};

const instancePayload = {
  data: {
    instanceId: 'inst-1',
    results: {
      tests: [
        {
          testId: 't1',
          title: ['Checkout', 'shows order summary'],
          state: 'passed',
        },
        {
          testId: 't2',
          title: ['Checkout', 'applies coupon'],
          state: 'failed',
        },
      ],
      screenshots: [
        {
          testId: 't1',
          screenshotId: 's1',
          name: 'after-checkout',
          testAttemptIndex: 0,
          screenshotURL: 'https://signed/screenshot1.png',
        },
      ],
      videos: [
        {
          testId: 't1',
          testAttemptIndex: 0,
          videoUrl: 'https://signed/video1.webm',
        },
      ],
      playwrightTraces: [
        {
          testId: 't2',
          traceId: 'tr1',
          name: 'trace',
          testAttemptIndex: 1,
          traceURL: 'https://signed/trace1.zip',
        },
      ],
      attachments: [
        {
          testId: 't1',
          testAttemptIndex: 0,
          name: 'before.txt',
          filename: 'before.txt',
          contentType: 'text/plain',
          readUrl: 'https://signed/before.txt',
        },
        // no testId: spec-level attachment
        { name: 'report.json', readUrl: 'https://signed/report.json' },
      ],
      videoUrl: 'https://signed/spec-video.mp4',
    },
  },
};

const parseManifest = (result: { content: { text: string }[] }) =>
  JSON.parse(result.content[0].text);

const ok = <T>(data: T) => ({ ok: true as const, data });

const failed = (path: string, status: number) => ({
  ok: false as const,
  method: 'GET' as const,
  path,
  status,
  body: null,
});

describe('getTestEvidenceTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires runId or projectId', async () => {
    const result = await getTestEvidenceTool.handler({});
    expect(result.content[0].text).toContain('runId or projectId');
    expect(request.fetchApi).not.toHaveBeenCalled();
  });

  it('resolves the run via /runs/find when only projectId and branch are given', async () => {
    vi.mocked(request.fetchApi).mockImplementation(async (path: string) => {
      if (path.startsWith('/runs/find'))
        return ok({ data: { runId: 'run-1' } });
      if (path === '/runs/run-1') return ok(runPayload);
      if (path.startsWith('/instances/')) return ok(instancePayload);
      return failed(path, 404);
    });

    const result = await getTestEvidenceTool.handler({
      projectId: 'p1',
      branch: 'feature-x',
    });

    const findUrl = vi.mocked(request.fetchApi).mock.calls[0][0] as string;
    expect(findUrl).toContain('/runs/find');
    expect(findUrl).toContain('projectId=p1');
    expect(findUrl).toContain('branch=feature-x');

    const manifest = parseManifest(result);
    expect(manifest.run.runId).toBe('run-1');
    expect(manifest.run.branch).toBe('feature-x');
    expect(manifest.run.dashboardUrl).toBe(
      'https://app.currents.dev/run/run-1'
    );
  });

  it('omits branch from /runs/find when ciBuildId is given', async () => {
    vi.mocked(request.fetchApi).mockImplementation(async (path: string) => {
      if (path.startsWith('/runs/find'))
        return ok({ data: { runId: 'run-1' } });
      if (path === '/runs/run-1') return ok(runPayload);
      if (path.startsWith('/instances/')) return ok(instancePayload);
      return failed(path, 404);
    });

    await getTestEvidenceTool.handler({
      projectId: 'p1',
      ciBuildId: 'build-42',
      branch: 'feature-x',
    });

    const findUrl = vi.mocked(request.fetchApi).mock.calls[0][0] as string;
    expect(findUrl).toContain('ciBuildId=build-42');
    expect(findUrl).not.toContain('branch');
  });

  it('groups artifacts by test and separates spec-level evidence', async () => {
    vi.mocked(request.fetchApi).mockImplementation(async (path: string) => {
      if (path === '/runs/run-1') return ok(runPayload);
      if (path.startsWith('/instances/')) return ok(instancePayload);
      return failed(path, 404);
    });

    const result = await getTestEvidenceTool.handler({
      runId: 'run-1',
      spec: 'checkout',
    });

    const manifest = parseManifest(result);
    expect(manifest.specs).toHaveLength(1);
    const specEntry = manifest.specs[0];
    expect(specEntry.spec).toBe('e2e/checkout.spec.ts');

    const t1 = specEntry.tests.find((t: any) => t.testId === 't1');
    expect(t1.title).toBe('Checkout > shows order summary');
    expect(t1.status).toBe('passed');
    expect(t1.evidence.screenshots).toEqual([
      {
        name: 'after-checkout',
        attempt: 0,
        url: 'https://signed/screenshot1.png',
      },
    ]);
    expect(t1.evidence.videos).toHaveLength(1);
    expect(t1.evidence.attachments[0].contentType).toBe('text/plain');

    const t2 = specEntry.tests.find((t: any) => t.testId === 't2');
    expect(t2.evidence.traces).toEqual([
      { name: 'trace', attempt: 1, url: 'https://signed/trace1.zip' },
    ]);

    // spec-level: attachment without testId + Cypress spec video
    expect(specEntry.specLevelEvidence.attachments[0].name).toBe('report.json');
    expect(
      specEntry.specLevelEvidence.videos.some(
        (v: any) => v.url === 'https://signed/spec-video.mp4'
      )
    ).toBe(true);
  });

  it('filters tests by title and status', async () => {
    vi.mocked(request.fetchApi).mockImplementation(async (path: string) => {
      if (path === '/runs/run-1') return ok(runPayload);
      if (path.startsWith('/instances/')) return ok(instancePayload);
      return failed(path, 404);
    });

    const result = await getTestEvidenceTool.handler({
      runId: 'run-1',
      spec: 'checkout',
      testTitle: 'coupon',
      testStatus: ['failed'],
    });

    const manifest = parseManifest(result);
    const tests = manifest.specs[0].tests;
    expect(tests).toHaveLength(1);
    expect(tests[0].testId).toBe('t2');
  });

  it('lists available spec files when the spec filter matches nothing', async () => {
    vi.mocked(request.fetchApi).mockImplementation(async (path: string) => {
      if (path === '/runs/run-1') return ok(runPayload);
      return failed(path, 404);
    });

    const result = await getTestEvidenceTool.handler({
      runId: 'run-1',
      spec: 'does-not-exist',
    });

    expect(result.content[0].text).toContain('No spec files matching');
    expect(result.content[0].text).toContain('e2e/checkout.spec.ts');
    expect(result.content[0].text).toContain('e2e/login.spec.ts');
  });

  it('reports when no run is found', async () => {
    vi.mocked(request.fetchApi).mockResolvedValue(failed('/runs/find', 404));

    const result = await getTestEvidenceTool.handler({
      projectId: 'p1',
      ciBuildId: 'missing-build',
    });

    expect(result.content[0].text).toContain('No run found');
    expect(result.content[0].text).toContain('ciBuildId=missing-build');
  });

  it('passes on a status other than 404 from the run lookup', async () => {
    vi.mocked(request.fetchApi).mockResolvedValue(failed('/runs/find', 403));

    const result = await getTestEvidenceTool.handler({
      projectId: 'p1',
      ciBuildId: 'build-42',
    });

    expect(result).toMatchObject({ isError: true });
    expect(result.content[0].text).toContain('HTTP 403');
  });

  it('reports an unreadable instance in its own spec entry', async () => {
    vi.mocked(request.fetchApi).mockImplementation(async (path: string) => {
      if (path === '/runs/run-1') return ok(runPayload);
      return failed(path, 500);
    });

    const result = await getTestEvidenceTool.handler({
      runId: 'run-1',
      spec: 'checkout',
    });

    const manifest = parseManifest(result);
    expect(manifest.specs[0].error).toContain('HTTP 500');
    expect(manifest.specs[0].instanceId).toBe('inst-1');
  });
});

/**
 * The reads are bounded so one tool call cannot fan out to 25 concurrent `/v1`
 * dispatches. Against a host that caps dispatches, an unbounded fan-out filled
 * the cap and then refused its own reads, which land in the manifest as an
 * `error` on the spec rather than as a failed tool call.
 */
describe('the instance read fan-out', () => {
  const manySpecs = (count: number) => ({
    data: {
      ...runPayload.data,
      specs: Array.from({ length: count }, (_, i) => ({
        instanceId: `inst-${i}`,
        spec: `e2e/spec-${i}.spec.ts`,
      })),
    },
  });

  it('keeps at most five instance reads in flight', async () => {
    let running = 0;
    let peak = 0;
    vi.mocked(request.fetchApi).mockImplementation(async (path: string) => {
      if (path === '/runs/run-1') return ok(manySpecs(25));
      if (!path.startsWith('/instances/')) return failed(path, 404);
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 1));
      running -= 1;
      return ok(instancePayload);
    });

    await getTestEvidenceTool.handler({ runId: 'run-1', maxInstances: 25 });

    expect(peak).toBe(5);
  });

  it('still reads every selected spec', async () => {
    vi.mocked(request.fetchApi).mockImplementation(async (path: string) => {
      if (path === '/runs/run-1') return ok(manySpecs(12));
      if (path.startsWith('/instances/')) return ok(instancePayload);
      return failed(path, 404);
    });

    const result = await getTestEvidenceTool.handler({
      runId: 'run-1',
      maxInstances: 12,
    });

    const manifest = parseManifest(result);
    expect(manifest.specs).toHaveLength(12);
    expect(manifest.specs.every((s: any) => !s.error)).toBe(true);
  });

  it('keeps the manifest in the order the specs were selected', async () => {
    vi.mocked(request.fetchApi).mockImplementation(async (path: string) => {
      if (path === '/runs/run-1') return ok(manySpecs(8));
      if (!path.startsWith('/instances/')) return failed(path, 404);
      // Later specs answer first, so the order cannot come from timing.
      const index = Number(path.split('inst-')[1]);
      await new Promise((resolve) => setTimeout(resolve, (8 - index) % 4));
      return ok(instancePayload);
    });

    const result = await getTestEvidenceTool.handler({
      runId: 'run-1',
      maxInstances: 8,
    });

    expect(parseManifest(result).specs.map((s: any) => s.spec)).toEqual(
      Array.from({ length: 8 }, (_, i) => `e2e/spec-${i}.spec.ts`)
    );
  });
});
