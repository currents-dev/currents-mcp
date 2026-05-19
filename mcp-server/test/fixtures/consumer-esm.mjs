import assert from "node:assert";
import { startMcpServer } from "../../dist/api.mjs";

assert.strictEqual(typeof startMcpServer, "function");
console.log("esm-ok");
