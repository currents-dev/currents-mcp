import { readFileSync } from "node:fs";
import { defineConfig } from "tsdown";
import { loadSkills } from "./scripts/load-skills.mjs";

const logoBase64 = readFileSync("./assets/logo.png").toString("base64");
const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));
const skills = loadSkills();

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    http: "./src/http.ts",
    api: "./src/api.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  define: {
    __LOGO_BASE64__: JSON.stringify(logoBase64),
    __VERSION__: JSON.stringify(version),
    __SKILLS__: JSON.stringify(skills),
  },
  deps: {
    neverBundle: [/^@modelcontextprotocol/, /^pino/, /^commander/, /^zod/],
  },
});
