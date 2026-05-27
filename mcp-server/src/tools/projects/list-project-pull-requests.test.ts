import { describe, expect, it, vi } from "vitest";
import * as request from "../../lib/request.js";
import { listProjectPullRequestsTool } from "./list-project-pull-requests.js";

describe("listProjectPullRequestsTool", () => {
  it("serializes query per OpenAPI (repeated status, bracket arrays)", async () => {
    vi.spyOn(request, "fetchApi").mockResolvedValue({ status: "OK", data: [] });

    await listProjectPullRequestsTool.handler({
      projectId: "p1",
      limit: 20,
      status: ["PASSED", "FAILED"],
      tags: ["smoke"],
      branches: ["main"],
      authors: ["dev@*"],
    });

    const url = vi.mocked(request.fetchApi).mock.calls[0][0] as string;
    expect(url).toContain("/projects/p1/pull-requests?");
    expect(url).toContain("limit=20");
    expect(url).toContain("status=PASSED");
    expect(url).toContain("status=FAILED");
    expect(url).toContain("tags%5B%5D=smoke");
    expect(url).toContain("branches%5B%5D=main");
    expect(url).toContain("authors%5B%5D=dev%40");
  });
});
