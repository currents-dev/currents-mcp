const assert = require("node:assert");
const { startMcpServer } = require("../../build/cjs/api.js");

assert.strictEqual(typeof startMcpServer, "function");
console.log("cjs-require-ok");
