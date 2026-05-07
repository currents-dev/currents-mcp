import assert from "node:assert";
import { startMcpServer } from "../../build/api.js";

assert.strictEqual(typeof startMcpServer, "function");
console.log("esm-ok");
