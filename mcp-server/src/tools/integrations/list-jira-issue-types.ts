import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  jiraProjectId: z
    .string()
    .min(1)
    .max(128)
    .describe("Jira project ID."),
  jira_installation_id: z
    .string()
    .min(1)
    .describe("Jira installation ID for the organization integration."),
  search: z.string().optional().describe("Search issue types by name."),
  page: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Page number for discovery results (default: 0)."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Maximum issue types per page (default: 50, max: 100)."),
});

const handler = async ({
  jiraProjectId,
  jira_installation_id,
  search,
  page,
  limit,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("jira_installation_id", jira_installation_id);
  if (search) {
    queryParams.append("search", search);
  }
  if (page !== undefined) {
    queryParams.append("page", page.toString());
  }
  if (limit !== undefined) {
    queryParams.append("limit", limit.toString());
  }

  const path = `/integrations/jira/projects/${encodeURIComponent(jiraProjectId)}/issue-types?${queryParams.toString()}`;
  logger.info(`Listing Jira issue types: ${path}`);

  const data = await fetchApi(path);
  if (!data) {
    return {
      content: [{ type: "text" as const, text: "Failed to list Jira issue types" }],
    };
  }

  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
};

export const listJiraIssueTypesTool = {
  schema: zodSchema,
  handler,
};
