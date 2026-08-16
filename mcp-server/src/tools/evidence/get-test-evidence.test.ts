import { beforeEach, describe, expect, it, vi } from "vitest";
import * as request from "../../lib/request.js";
import { getTestEvidenceTool } from "./get-test-evidence.js";

vi.mock("../../lib/request.js");

const runPayload = {
  data: {
    runId: "run-1",
    projectId: "p1",
    createdAt: "2026-08-01T00:00:00Z",
    status: "PASSED",
    meta: {
      ciBuildId: "build-42",
      commit: { branch: "feature-x", sha: "abc123" },
    },
    specs: [
      { instanceId: "inst-1", spec: "e2e/checkout.spec.ts" },
      { instanceId: "inst-2", spec: "e2e/login.spec.ts" },
    ],
  },
};

const instancePayload = {
  data: {
    instanceId: "inst-1",
    results: {
      tests: [
        {
          testId: "t1",
          title: ["Checkout", "shows order summary"],
          state: "passed",
        },
        { testId: "t2", title: ["Checkout", "applies coupon"], state: "failed" },
      ],
      screenshots: [
        {
          testId: "t1",
          screenshotId: "s1",
          name: "after-checkout",
          testAttemptIndex: 0,
          screenshotURL: "https://signed/screenshot1.png",
        },
      ],
      videos: [
        { testId: "t1", testAttemptIndex: 0, videoUrl: "https://signed/video1.webm" },
      ],
      playwrightTraces: [
        {
          testId: "t2",
          traceId: "tr1",
          name: "trace",
          testAttemptIndex: 1,
          traceURL: "https://signed/trace1.zip",
        },
      ],
      attachments: [
        {
          testId: "t1",
          testAttemptIndex: 0,
          name: "before.txt",
          filename: "before.txt",
          contentType: "text/plain",
          readUrl: "https://signed/before.txt",
        },
        // no testId: spec-level attachment
        { name: "report.json", readUrl: "https://signed/report.json" },
      ],
      videoUrl: "https://signed/spec-video.mp4",
    },
  },
};

const parseManifest = (result: { content: { text: string }[] }) =>
  JSON.parse(result.content[0].text);

describe("getTestEvidenceTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires runId or projectId", async () => {
    const result = await getTestEvidenceTool.handler({});
    expect(result.content[0].text).toContain("runId or projectId");
    expect(request.fetchApi).not.toHaveBeenCalled();
  });

  it("resolves the run via /runs/find when only projectId and branch are given", async () => {
    vi.mocked(request.fetchApi).mockImplementation(async (path: string) => {
      if (path.startsWith("/runs/find")) return { data: { runId: "run-1" } };
      if (path === "/runs/run-1") return runPayload;
      if (path.startsWith("/instances/")) return instancePayload;
      return null;
    });

    const result = await getTestEvidenceTool.handler({
      projectId: "p1",
      branch: "feature-x",
    });

    const findUrl = vi.mocked(request.fetchApi).mock.calls[0][0] as string;
    expect(findUrl).toContain("/runs/find");
    expect(findUrl).toContain("projectId=p1");
    expect(findUrl).toContain("branch=feature-x");

    const manifest = parseManifest(result);
    expect(manifest.run.runId).toBe("run-1");
    expect(manifest.run.branch).toBe("feature-x");
    expect(manifest.run.dashboardUrl).toBe("https://app.currents.dev/run/run-1");
  });

  it("groups artifacts by test and separates spec-level evidence", async () => {
    vi.mocked(request.fetchApi).mockImplementation(async (path: string) => {
      if (path === "/runs/run-1") return runPayload;
      if (path.startsWith("/instances/")) return instancePayload;
      return null;
    });

    const result = await getTestEvidenceTool.handler({
      runId: "run-1",
      spec: "checkout",
    });

    const manifest = parseManifest(result);
    expect(manifest.specs).toHaveLength(1);
    const specEntry = manifest.specs[0];
    expect(specEntry.spec).toBe("e2e/checkout.spec.ts");

    const t1 = specEntry.tests.find((t: any) => t.testId === "t1");
    expect(t1.title).toBe("Checkout > shows order summary");
    expect(t1.status).toBe("passed");
    expect(t1.evidence.screenshots).toEqual([
      { name: "after-checkout", attempt: 0, url: "https://signed/screenshot1.png" },
    ]);
    expect(t1.evidence.videos).toHaveLength(1);
    expect(t1.evidence.attachments[0].contentType).toBe("text/plain");

    const t2 = specEntry.tests.find((t: any) => t.testId === "t2");
    expect(t2.evidence.traces).toEqual([
      { name: "trace", attempt: 1, url: "https://signed/trace1.zip" },
    ]);

    // spec-level: attachment without testId + Cypress spec video
    expect(specEntry.specLevelEvidence.attachments[0].name).toBe("report.json");
    expect(
      specEntry.specLevelEvidence.videos.some(
        (v: any) => v.url === "https://signed/spec-video.mp4"
      )
    ).toBe(true);
  });

  it("filters tests by title and status", async () => {
    vi.mocked(request.fetchApi).mockImplementation(async (path: string) => {
      if (path === "/runs/run-1") return runPayload;
      if (path.startsWith("/instances/")) return instancePayload;
      return null;
    });

    const result = await getTestEvidenceTool.handler({
      runId: "run-1",
      spec: "checkout",
      testTitle: "coupon",
      testStatus: ["failed"],
    });

    const manifest = parseManifest(result);
    const tests = manifest.specs[0].tests;
    expect(tests).toHaveLength(1);
    expect(tests[0].testId).toBe("t2");
  });

  it("lists available spec files when the spec filter matches nothing", async () => {
    vi.mocked(request.fetchApi).mockImplementation(async (path: string) => {
      if (path === "/runs/run-1") return runPayload;
      return null;
    });

    const result = await getTestEvidenceTool.handler({
      runId: "run-1",
      spec: "does-not-exist",
    });

    expect(result.content[0].text).toContain("No spec files matching");
    expect(result.content[0].text).toContain("e2e/checkout.spec.ts");
    expect(result.content[0].text).toContain("e2e/login.spec.ts");
  });

  it("reports when no run is found", async () => {
    vi.mocked(request.fetchApi).mockResolvedValue(null);

    const result = await getTestEvidenceTool.handler({
      projectId: "p1",
      ciBuildId: "missing-build",
    });

    expect(result.content[0].text).toContain("No run found");
    expect(result.content[0].text).toContain("ciBuildId=missing-build");
  });
});
