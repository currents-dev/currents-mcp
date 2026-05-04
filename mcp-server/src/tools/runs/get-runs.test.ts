import { beforeEach, describe, expect, it, vi } from "vitest";
import * as request from "../../lib/request.js";
import { getRunsTool } from "./get-runs.js";

vi.mock("../../lib/request.js");

describe("getRunsTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serializes list runs query per OpenAPI (status[], completion_state[], pr_id)", async () => {
    vi.spyOn(request, "fetchApi").mockResolvedValue({ status: "OK", data: [] });

    await getRunsTool.handler({
      projectId: "p1",
      status: ["PASSED", "FAILED"],
      completion_state: ["COMPLETE"],
      pr_id: "42",
    });

    const url = vi.mocked(request.fetchApi).mock.calls[0][0] as string;
    expect(url).toContain("status%5B%5D=PASSED");
    expect(url).toContain("status%5B%5D=FAILED");
    expect(url).toContain("completion_state%5B%5D=COMPLETE");
    expect(url).toContain("pr_id=42");
  });
});
