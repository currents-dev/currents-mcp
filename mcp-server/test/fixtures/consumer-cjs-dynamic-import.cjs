const assert = require("node:assert");

import("../../dist/api.mjs")
  .then(({ startMcpServer }) => {
    assert.strictEqual(typeof startMcpServer, "function");
    console.log("cjs-dynamic-import-ok");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
