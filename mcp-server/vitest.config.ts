import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

const logoBase64 = readFileSync("./assets/logo.png").toString("base64");
const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  define: {
    __LOGO_BASE64__: JSON.stringify(logoBase64),
    __VERSION__: JSON.stringify(version),
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/index.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
