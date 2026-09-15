import { z } from 'zod';
import { postApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const customFieldSchema = z.object({
  fieldId: z
    .string()
    .min(1)
    .describe('Jira field ID from issue type discovery.'),
  value: z.string().min(1).describe('String value for the Jira custom field.'),
});

const zodSchema = z.object({
  projectId: z.string().min(1).describe('Currents project ID.'),
  runId: z.string().min(1).describe('Currents run ID containing the test.'),
  testId: z.string().min(1).describe('Test ID within the run.'),
  jiraInstallationId: z
    .string()
    .min(1)
    .describe(
      'Jira installation ID for the org integration (dashboard Installation ID).'
    ),
  jiraProjectId: z
    .string()
    .min(1)
    .describe('Jira project ID in which to create the issue.'),
  jiraIssueType: z.string().min(1).describe('Jira issue type ID.'),
  customFields: z
    .array(customFieldSchema)
    .optional()
    .describe('Optional Jira custom fields for issue creation.'),
});

const handler = async ({
  projectId,
  runId,
  testId,
  jiraInstallationId,
  jiraProjectId,
  jiraIssueType,
  customFields,
}: z.infer<typeof zodSchema>) => {
  const body: Record<string, unknown> = {
    runId,
    testId,
    jiraInstallationId,
    jiraProjectId,
    jiraIssueType,
  };
  if (customFields?.length) {
    body.customFields = customFields;
  }

  const path = `/projects/${encodeURIComponent(projectId)}/jira/issues`;
  logger.info(`Creating Jira issue: ${path}`);

  const result = await postApi(path, body);
  if (!result.ok) {
    return apiFailureResult('Failed to create Jira issue', result);
  }

  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(result.data, null, 2) },
    ],
  };
};

export const createJiraIssueFromRunTestTool = {
  scope: 'issues:write',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;
