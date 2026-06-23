import type { IncomingMessage } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestContext } from "./lib/context.js";
import { fetchApi } from "./lib/request.js";
import { extractApiKey } from "./http.js";

vi.mock("./lib/env.js", () => ({
  CURRENTS_API_KEY: "env-key",
  CURRENTS_API_URL: "https://api.test.com",
}));

vi.mock("./lib/logger.js", () => ({
  logger: { error: vi.fn(), debug: vi.fn() },
}));

const reqWithAuth = (authorization?: string) =>
  ({ headers: authorization ? { authorization } : {} }) as IncomingMessage;

describe("extractApiKey", () => {
  it("extracts the token from a Bearer header", () => {
    expect(extractApiKey(reqWithAuth("Bearer abc123"))).toBe("abc123");
  });

  it("is case-insensitive and trims surrounding whitespace", () => {
    expect(extractApiKey(reqWithAuth("  bearer   abc123  "))).toBe("abc123");
  });

  it("returns the raw value when there is no Bearer prefix", () => {
    expect(extractApiKey(reqWithAuth("abc123"))).toBe("abc123");
  });

  it("returns undefined when no Authorization header is present", () => {
    expect(extractApiKey(reqWithAuth())).toBeUndefined();
  });
});

describe("API key passthrough via request context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the per-request key for the outbound Currents call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock;

    await requestContext.run({ apiKey: "req-key" }, () => fetchApi("/runs/1"));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test.com/runs/1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer req-key",
        }),
      }),
    );
  });

  it("does not bleed keys across concurrent requests", async () => {
    const authByKey: Record<string, unknown> = {};
    global.fetch = vi.fn().mockImplementation((_url, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      // Record which Authorization header each path saw.
      const path = String(_url);
      authByKey[path] = auth;
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await Promise.all([
      requestContext.run({ apiKey: "key-a" }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        return fetchApi("/a");
      }),
      requestContext.run({ apiKey: "key-b" }, () => fetchApi("/b")),
    ]);

    expect(authByKey["https://api.test.com/a"]).toBe("Bearer key-a");
    expect(authByKey["https://api.test.com/b"]).toBe("Bearer key-b");
  });
});
