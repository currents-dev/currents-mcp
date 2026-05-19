import { readFileSync } from "node:fs";
import { defineConfig } from "tsdown";

const logoBase64 = readFileSync("./assets/logo.png").toString("base64");
const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    api: "./src/api.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  define: {
    __LOGO_BASE64__: JSON.stringify(logoBase64),
    __VERSION__: JSON.stringify(version),
  },
  deps: {
    neverBundle: [/^@modelcontextprotocol/, /^pino/, /^commander/, /^zod/],
  },
});
