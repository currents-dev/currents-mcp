#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CURRENTS_API_KEY } from "./lib/env.js";
import { fetchApi, fetchPaginatedApi } from "./lib/request.js";
import { InstanceData, ProjectListResponse, RunResponse } from "./types.js";
import { getProjectMap } from "./lib/projects.js";
import { logger } from "./lib/logger.js";

if (CURRENTS_API_KEY === "") {
  console.error("CURRENTS_API_KEY env variable is not set.");
}

// Create server instance
const server = new McpServer({
  name: "currents",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register Currents tools
server.tool(
  "currents-get-projects",
  "Get information about all Currents projects",
  async () => {
    const projects = await fetchPaginatedApi<ProjectListResponse>("/projects");

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(projects, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "currents-get-run",
  "Get run details for a defined run ID",
  {
    runId: z.string(),
  },
  async ({ runId }) => {
    const runData = await fetchApi<RunResponse>(`/runs/${runId}`);

    if (!runData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve run data",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(runData, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "currents-get-spec-file-attempts-and-errors",
  "Get test spec file attempts and errors",
  {
    instanceId: z.string(),
  },
  async ({ instanceId }) => {
    const instanceData = await fetchApi<InstanceData>(
      `/instances/${instanceId}`
    );

    if (!instanceData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve spec file attempts and errors data",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(instanceData, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "currents-get-spec-files-performance",
  "Gets test spec files performance from a project with the desired order. Useful to get top flaky, failing, slowest or most executed spec files.",
  {
    projectId: z.string(),
    from: z
      .string()
      .describe(
        "The start of the date range to fetch the metrics from. ISO 8601 date."
      )
      .default(
        // 30 days ago
        new Date(new Date().setDate(new Date().getDate() - 30)).toISOString()
      ),
    to: z
      .string()
      .describe(
        "The end of the date range to fetch the metrics from. ISO 8601 date."
      )
      .default(new Date().toISOString()),
    specNameFilter: z
      .string()
      .optional()
      .describe(
        "The spec name to filter by. If not provided, a paginated response of all spec files will be returned."
      ),
    order: z
      .enum([
        "failedExecutions",
        "failureRate",
        "flakeRate",
        "flakyExecutions",
        "fullyReported",
        "overallExecutions",
        "suiteSize",
        "timeoutExecutions",
        "timeoutRate",
        "avgDuration",
      ])
      .default("avgDuration"),
    orderDirection: z.enum(["asc", "desc"]).default("desc"),
    limit: z.number().optional().default(50),
    page: z.number().optional().default(0),
    tags: z.array(z.string()).optional().default([]),
    branches: z.array(z.string()).optional().default([]),
    authors: z.array(z.string()).optional().default([]),
  },
  async ({
    projectId,
    from,
    to,
    specNameFilter,
    order,
    orderDirection,
    limit,
    page,
    tags,
    branches,
    authors,
  }) => {
    const queryParams = new URLSearchParams();
    queryParams.append("date_start", from);
    queryParams.append("date_end", to);
    queryParams.append("order", order);
    queryParams.append("dir", orderDirection);
    queryParams.append("limit", limit.toString());
    queryParams.append("page", page.toString());

    if (specNameFilter) {
      queryParams.append("specNameFilter", specNameFilter);
    }

    if (tags.length > 0) {
      queryParams.append("tags", tags.join("&tags[]="));
    }

    if (branches.length > 0) {
      queryParams.append("branches", branches.join("&branches[]="));
    }

    if (authors.length > 0) {
      queryParams.append("authors", authors.join("&authors[]="));
    }

    logger.info(
      `Fetching spec files performance for project ${projectId} with query params: ${queryParams.toString()}`
    );

    const data = await fetchApi<InstanceData>(
      `/spec-files/${projectId}?${queryParams.toString()}`
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve project spec files",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "currents-get-tests-performance",
  "Gets tests performance from a project with the desired order. Useful to get top flaky, failing, slowest or most executed tests.",
  {
    projectId: z.string(),
    from: z
      .string()
      .describe(
        "The start of the date range to fetch the metrics from. ISO 8601 date, but without the time part"
      )
      .default(
        // 30 days ago
        new Date(new Date().setDate(new Date().getDate() - 30))
          .toISOString()
          .split("T")[0]
      ),
    to: z
      .string()
      .describe(
        "The end of the date range to fetch the metrics from. ISO 8601 date, but without the time part"
      )
      .default(new Date().toISOString().split("T")[0]),
    specNameFilter: z
      .string()
      .optional()
      .describe(
        "The spec name to filter by. If not provided, a paginated response of all spec files will be returned."
      ),
    testNameFilter: z
      .string()
      .optional()
      .describe(
        "The test name to filter by. If not provided, a paginated response of all tests will be returned."
      ),
    order: z.enum([
      "duration",
      "executions",
      "failures",
      "flakiness",
      "passes",
      "title",
      "durationXSamples",
      "failRateXSamples",
      "failureRateDelta",
      "flakinessRateDelta",
      "flakinessXSamples",
    ]),
    orderDirection: z.enum(["asc", "desc"]).default("desc"),
    limit: z.number().optional().default(50),
    page: z.number().optional().default(0),
    tags: z.array(z.string()).optional().default([]),
    branches: z.array(z.string()).optional().default([]),
    authors: z.array(z.string()).optional().default([]),
  },
  async ({
    projectId,
    from,
    to,
    specNameFilter,
    testNameFilter,
    order,
    orderDirection,
    limit,
    page,
    tags,
    branches,
    authors,
  }) => {
    const queryParams = new URLSearchParams();
    queryParams.append("date_start", from);
    queryParams.append("date_end", to);
    queryParams.append("order", order);
    queryParams.append("dir", orderDirection);
    queryParams.append("limit", limit.toString());
    queryParams.append("page", page.toString());

    if (specNameFilter) {
      queryParams.append("spec", specNameFilter);
    }

    if (testNameFilter) {
      queryParams.append("test", testNameFilter);
    }

    if (tags.length > 0) {
      queryParams.append("tags", tags.join("&tags[]="));
    }

    if (branches.length > 0) {
      queryParams.append("branches", branches.join("&branches[]="));
    }

    if (authors.length > 0) {
      queryParams.append("authors", authors.join("&authors[]="));
    }

    logger.info(
      `Fetching tests performance for project ${projectId} with query params: ${queryParams.toString()}`
    );

    const data = await fetchApi<InstanceData>(
      `/tests/${projectId}?${queryParams.toString()}`
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve project tests",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "currents-find-test-signature",
  "Find a test signature by its spec file name and test name. Useful to consume the tool that find test results and debugging data.",
  {
    projectId: z.string(),
    spec: z.string().describe("The spec name the test belongs to."),
    title: z.string().describe("The test name."),
  },
  async ({ projectId, spec, title }) => {
    const queryParams = new URLSearchParams();
    queryParams.append(
      "date_start",
      new Date(new Date().setDate(new Date().getDate() - 365)).toISOString()
    );
    queryParams.append("date_end", new Date().toISOString());
    queryParams.append("spec", spec);
    queryParams.append("title", title);

    logger.info(
      `Fetching test signature for project ${projectId} with query params: ${queryParams.toString()}`
    );

    const data = await fetchApi<InstanceData>(
      `/spec-files/${projectId}?${queryParams.toString()}`
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve project spec files",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "currents-get-test-results",
  "Gets test results of a test by its signature. Useful for debugging and analyzing test results.",
  {
    signature: z.string().describe("The test signature."),
    tags: z.array(z.string()).optional().default([]),
    branches: z.array(z.string()).optional().default([]),
    authors: z.array(z.string()).optional().default([]),
    status: z.enum(["failed", "passed", "skipped", "pending"]).optional(),
  },
  async ({ signature, tags, branches, authors, status }) => {
    const queryParams = new URLSearchParams();
    queryParams.append(
      "date_start",
      new Date(new Date().setDate(new Date().getDate() - 365)).toISOString()
    );
    queryParams.append("date_end", new Date().toISOString());
    queryParams.append("limit", "20");

    if (status) {
      queryParams.append("status", status);
    }

    if (tags.length > 0) {
      queryParams.append("tag", tags.join("&tag[]="));
    }

    if (branches.length > 0) {
      queryParams.append("branch", branches.join("&branch[]="));
    }

    if (authors.length > 0) {
      queryParams.append("git_author", authors.join("&git_author[]="));
    }

    logger.info(
      `Fetching test results for test ${signature} with query params: ${queryParams.toString()}`
    );

    const data = await fetchApi<InstanceData>(
      `/test-results/${signature}?${queryParams.toString()}`
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve project spec files",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

async function registerDynamicTools() {
  logger.debug("⚙️ Registering dynamic tools");

  const projectMap = await getProjectMap();

  const projectNames = Array.from(projectMap.keys());

  logger.info(`ℹ️ Available projects: ${projectNames.join(", ")}`);

  // Tool that requires a projectId from the dropdown
  server.tool(
    "currents-get-project-id-from-name",
    "Get the project ID from the project name, so that other tools and APIs can be consumed.",
    {
      projectName: z.enum(projectNames as [string, ...string[]]),
    },
    async ({ projectName }) => {
      const project = projectMap.get(projectName);

      if (!project) {
        return {
          content: [
            {
              type: "text",
              text: `Project ${projectName} not found`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(project, null, 2),
          },
        ],
      };
    }
  );
}

async function main() {
  await registerDynamicTools();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.debug("🚀 Currents MCP Server is live");
  await new Promise(() => {});
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
