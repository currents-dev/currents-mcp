import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

async function printResult(name, result) {
  console.log(`\n=== ${name} result ===`);
  for (const c of result.content ?? []) {
    if (c.type === "text") {
      console.log(c.text);
    } else {
      console.log(JSON.stringify(c, null, 2));
    }
  }
}

async function main() {
  // Spawns your MCP server as a subprocess over stdio
  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"],
  });

  const client = new Client({ name: "currents-test-client", version: "1.0.0" });
  await client.connect(transport);

  // List available tools (pass schema to avoid parse error)
  const toolsList = await client.request({ method: "tools/list" }, ListToolsResultSchema);
  console.log("\nTools:", toolsList.tools.map((t) => t.name));

  // Call: currents-get-projects (no args)
  const projects = await client.callTool({
    name: "currents-get-projects",
    arguments: {},
  });
  await printResult("currents-get-projects", projects);

  await client.close();
  transport.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});