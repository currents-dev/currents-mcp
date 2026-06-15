import { describe, expect, it, vi } from "vitest";
import { getApiKey, requestContext } from "./context.js";

// Falls back to this when no per-request context is set (stdio path).
vi.mock("./env.js", () => ({
  CURRENTS_API_KEY: "env-key",
  CURRENTS_API_URL: "https://api.test.com",
}));

describe("getApiKey", () => {
  it("falls back to the env key when no request context is set", () => {
    expect(getApiKey()).toBe("env-key");
  });

  it("prefers the per-request context key over the env key", () => {
    const result = requestContext.run({ apiKey: "req-key" }, () => getApiKey());
    expect(result).toBe("req-key");
  });

  it("falls back to env when the context apiKey is undefined", () => {
    const result = requestContext.run({}, () => getApiKey());
    expect(result).toBe("env-key");
  });

  it("isolates keys across concurrent requests (no bleed)", async () => {
    const seen: Record<string, string> = {};

    const run = (key: string) =>
      requestContext.run({ apiKey: key }, async () => {
        // Yield so both contexts are active concurrently.
        await new Promise((resolve) => setTimeout(resolve, key === "a" ? 5 : 0));
        seen[key] = getApiKey();
      });

    await Promise.all([run("a"), run("b")]);

    expect(seen).toEqual({ a: "a", b: "b" });
    // Outside any context, still the env fallback.
    expect(getApiKey()).toBe("env-key");
  });
});
