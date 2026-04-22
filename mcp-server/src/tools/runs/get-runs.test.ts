import { beforeEach, describe, expect, it, vi } from "vitest";
import * as request from "../../lib/request.js";
import { getRunsTool } from "./get-runs.js";

vi.mock("../../lib/request.js");

describe("getRunsTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serializes status and completion_state as bracket params per OpenAPI", async () => {
    vi.spyOn(request, "fetchApi").mockResolvedValue({ status: "OK", data: [] });

    await getRunsTool.handler({
      projectId: "p1",
      status: ["FAILED"],
      completion_state: ["COMPLETE"],
    });

    expect(request.fetchApi).toHaveBeenCalledWith(
      expect.stringContaining("status%5B%5D=FAILED")
    );
    expect(request.fetchApi).toHaveBeenCalledWith(
      expect.stringContaining("completion_state%5B%5D=COMPLETE")
    );
  });

  it("serializes deprecated tag[] when tag is provided", async () => {
    vi.spyOn(request, "fetchApi").mockResolvedValue({ status: "OK", data: [] });

    await getRunsTool.handler({
      projectId: "p1",
      tag: ["nightly"],
    });

    expect(request.fetchApi).toHaveBeenCalledWith(
      expect.stringContaining("tag%5B%5D=nightly")
    );
  });
});
