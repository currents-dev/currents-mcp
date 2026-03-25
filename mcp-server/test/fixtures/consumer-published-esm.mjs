import assert from "node:assert";
import { startMcpServer } from "@currents/mcp";

assert.strictEqual(typeof startMcpServer, "function");
console.log("published-esm-ok");
