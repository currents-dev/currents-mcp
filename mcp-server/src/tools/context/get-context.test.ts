import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/env.js", () => ({
  CURRENTS_API_KEY: "k",
  CURRENTS_API_URL: "https://api.test.com/v1",
}));

const { getContextTool } = await import("./get-context.js");

describe("getContextTool", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ status: "OK", data: { level: "run" } }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("calls GET /context with query params for run-level", async () => {
    await getContextTool.handler({
      run_id: "run-1",
      format: "json",
      detail: "default",
      limit: 10,
      page: 0,
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.com/v1/context?run_id=run-1&format=json&detail=default&limit=10&page=0",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer k",
          Accept: "application/json",
        }),
      })
    );
  });

  it("rejects test_id without instance_id", async () => {
    const result = await getContextTool.handler({
      run_id: "run-1",
      test_id: "t1",
    } as any);

    expect(result.content[0].type).toBe("text");
    expect(String((result.content[0] as { text: string }).text)).toContain(
      "Invalid parameters"
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows test-level shape with instance_id + test_id without run_id", async () => {
    await getContextTool.handler({
      instance_id: "inst-1",
      test_id: "t1",
      format: "json",
      detail: "default",
      limit: 10,
      page: 0,
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.com/v1/context?instance_id=inst-1&test_id=t1&format=json&detail=default&limit=10&page=0",
      expect.any(Object)
    );
  });
});
