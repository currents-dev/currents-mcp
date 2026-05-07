import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cjsDir = join(root, "build", "cjs");
mkdirSync(cjsDir, { recursive: true });
writeFileSync(join(cjsDir, "package.json"), `${JSON.stringify({ type: "commonjs" })}\n`);
