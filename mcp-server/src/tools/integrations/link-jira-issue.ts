import { z } from "zod";
import { postApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z
  .object({
    projectId: z.string().describe("Currents project ID."),
    jiraIssueKey: z
      .string()
      .min(1)
      .describe("Existing Jira issue key to link (e.g. PROJ-123)."),
    runId: z.string().min(1).describe("Currents run ID containing the test."),
    testId: z.string().min(1).describe("Test ID within the run."),
    jiraInstallationId: z
      .string()
      .min(1)
      .describe("Jira installation ID for the org integration (dashboard Installation ID)."),
    jiraProjectId: z.string().min(1).describe("Jira project ID for the linked issue."),
    jiraIssueType: z
      .string()
      .min(1)
      .describe("Jira issue type identifier stored on the Currents ticket."),
    comment: z
      .string()
      .optional()
      .describe(
        "Optional text prepended to the Jira comment and Currents issue description before automated test context."
      ),
    includeContextInComment: z
      .boolean()
      .optional()
      .describe(
        "When true (default), appends automated test context to the Jira comment. When false, comment is required and used alone."
      ),
  })
  .superRefine((val, ctx) => {
    if (val.includeContextInComment === false && !val.comment?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "comment is required when includeContextInComment is false",
        path: ["comment"],
      });
    }
  });

const handler = async ({
  projectId,
  jiraIssueKey,
  runId,
  testId,
  jiraInstallationId,
  jiraProjectId,
  jiraIssueType,
  comment,
  includeContextInComment,
}: z.infer<typeof zodSchema>) => {
  const body: Record<string, unknown> = {
    runId,
    testId,
    jiraInstallationId,
    jiraProjectId,
    jiraIssueType,
  };
  if (comment !== undefined) {
    body.comment = comment;
  }
  if (includeContextInComment !== undefined) {
    body.includeContextInComment = includeContextInComment;
  }

  const path = `/projects/${encodeURIComponent(projectId)}/jira/issues/${encodeURIComponent(jiraIssueKey)}/link`;
  logger.info(`Linking Jira issue: ${path}`);

  const data = await postApi(path, body);
  if (!data) {
    return {
      content: [{ type: "text" as const, text: "Failed to link Jira issue" }],
    };
  }

  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
};

export const linkJiraIssueFromRunTestTool = {
  schema: zodSchema,
  handler,
};
