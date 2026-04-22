import { beforeEach, describe, expect, it, vi } from "vitest";
import * as request from "../../lib/request.js";
import { listAffectedTestsTool } from "./list-affected-tests.js";

vi.mock("../../lib/request.js");

describe("listAffectedTestsTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serializes action_type as action_type[] per OpenAPI", async () => {
    vi.spyOn(request, "fetchApi").mockResolvedValue({ status: "OK", data: [] });

    await listAffectedTestsTool.handler({
      projectId: "p1",
      date_start: "2026-01-01",
      date_end: "2026-01-02",
      action_type: ["skip", "tag"],
    });

    expect(request.fetchApi).toHaveBeenCalledWith(
      expect.stringContaining("action_type%5B%5D=skip")
    );
    expect(request.fetchApi).toHaveBeenCalledWith(
      expect.stringContaining("action_type%5B%5D=tag")
    );
  });

  it("serializes status as status[] per OpenAPI", async () => {
    vi.spyOn(request, "fetchApi").mockResolvedValue({ status: "OK", data: [] });

    await listAffectedTestsTool.handler({
      projectId: "p1",
      date_start: "2026-01-01",
      date_end: "2026-01-02",
      status: ["active"],
    });

    expect(request.fetchApi).toHaveBeenCalledWith(
      expect.stringContaining("status%5B%5D=active")
    );
  });
});
