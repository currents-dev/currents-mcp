import { beforeEach, describe, expect, it, vi } from "vitest";
import * as request from "../../lib/request.js";
import { getTestResultsTool } from "./get-test-results.js";

vi.mock("../../lib/request.js");

describe("getTestResultsTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serializes deprecated branch[], tag[], git_author[], group[] when set", async () => {
    vi.spyOn(request, "fetchApi").mockResolvedValue({ status: "OK", data: [] });

    await getTestResultsTool.handler({
      signature: "sig1",
      date_start: "2026-01-01",
      date_end: "2026-01-02",
      branch: ["main"],
      tag: ["smoke"],
      git_author: ["alice"],
      group: ["g1"],
    });

    const url = (request.fetchApi as any).mock.calls[0][0] as string;
    expect(url).toContain("branch%5B%5D=main");
    expect(url).toContain("tag%5B%5D=smoke");
    expect(url).toContain("git_author%5B%5D=alice");
    expect(url).toContain("group%5B%5D=g1");
  });
});
