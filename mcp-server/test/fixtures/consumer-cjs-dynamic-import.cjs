const assert = require("node:assert");

import("../../build/api.js")
  .then(({ startMcpServer }) => {
    assert.strictEqual(typeof startMcpServer, "function");
    console.log("cjs-dynamic-import-ok");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
