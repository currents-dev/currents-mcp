import { describe, expect, it } from "vitest";
import { handleCliMetadataFlags } from "./cli.js";

function capture() {
  let text = "";
  return {
    stream: {
      write(chunk: string | Uint8Array) {
        text += chunk.toString();
        return true;
      },
    },
    get text() {
      return text;
    },
  };
}

describe("handleCliMetadataFlags", () => {
  it.each(["--help", "-h"])("prints help for %s", (flag) => {
    const out = capture();
    const err = capture();

    const result = handleCliMetadataFlags(
      ["node", "dist/index.mjs", flag],
      "2.3.2",
      out.stream,
      err.stream,
    );

    expect(result).toEqual({ handled: true, exitCode: 0 });
    expect(out.text).toContain("Usage: mcp [options]");
    expect(out.text).toContain("--version");
    expect(err.text).toBe("");
  });

  it.each(["--version", "-v"])("prints version for %s", (flag) => {
    const out = capture();
    const err = capture();

    const result = handleCliMetadataFlags(
      ["node", "dist/index.mjs", flag],
      "2.3.2",
      out.stream,
      err.stream,
    );

    expect(result).toEqual({ handled: true, exitCode: 0 });
    expect(out.text).toBe("2.3.2\n");
    expect(err.text).toBe("");
  });

  it("returns control for server startup without CLI metadata flags", () => {
    const out = capture();
    const err = capture();

    const result = handleCliMetadataFlags(
      ["node", "dist/index.mjs"],
      "2.3.2",
      out.stream,
      err.stream,
    );

    expect(result).toEqual({ handled: false });
    expect(out.text).toBe("");
    expect(err.text).toBe("");
  });

  it("reports unknown top-level options without starting the server", () => {
    const out = capture();
    const err = capture();

    const result = handleCliMetadataFlags(
      ["node", "dist/index.mjs", "--definitely-not-real"],
      "2.3.2",
      out.stream,
      err.stream,
    );

    expect(result).toEqual({ handled: true, exitCode: 1 });
    expect(out.text).toBe("");
    expect(err.text).toContain("Unknown option: --definitely-not-real");
    expect(err.text).toContain("Usage: mcp [options]");
  });
});
