import { beforeEach, describe, expect, it, vi } from "vitest";
import * as request from "../../lib/request.js";
import { listActionsTool } from "./list-actions.js";

vi.mock("../../lib/request.js");

describe("listActionsTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serializes status as status[] per OpenAPI explode array", async () => {
    vi.spyOn(request, "fetchApi").mockResolvedValue({ status: "OK", data: [] });

    await listActionsTool.handler({
      projectId: "p1",
      status: ["active", "disabled"],
    });

    expect(request.fetchApi).toHaveBeenCalledWith(
      expect.stringContaining("status%5B%5D=active")
    );
    expect(request.fetchApi).toHaveBeenCalledWith(
      expect.stringContaining("status%5B%5D=disabled")
    );
  });
});
