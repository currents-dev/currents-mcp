const assert = require("node:assert");
const { startMcpServer } = require("../../dist/api.cjs");

assert.strictEqual(typeof startMcpServer, "function");
console.log("cjs-require-ok");
