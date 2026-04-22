import { beforeEach, describe, expect, it, vi } from "vitest";
import * as request from "../../lib/request.js";
import { findRunTool } from "./find-run.js";

vi.mock("../../lib/request.js");

describe("findRunTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serializes tag[] in addition to tags[] when provided", async () => {
    vi.spyOn(request, "fetchApi").mockResolvedValue({ status: "OK", data: {} });

    await findRunTool.handler({
      projectId: "p1",
      tags: ["a"],
      tag: ["b"],
    });

    expect(request.fetchApi).toHaveBeenCalledWith(
      expect.stringContaining("tags%5B%5D=a")
    );
    expect(request.fetchApi).toHaveBeenCalledWith(
      expect.stringContaining("tag%5B%5D=b")
    );
  });
});
