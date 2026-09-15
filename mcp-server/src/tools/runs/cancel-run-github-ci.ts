import { z } from 'zod';
import { putApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  githubRunId: z.string().describe('GitHub Actions workflow run ID.'),
  githubRunAttempt: z
    .number()
    .int()
    .describe('GitHub Actions workflow run attempt number.'),
  projectId: z
    .string()
    .optional()
    .describe('Optional project ID to scope the cancellation.'),
  ciBuildId: z
    .string()
    .optional()
    .describe('Optional CI build ID to scope the cancellation.'),
});

interface CancelRunGithubCIRequest {
  githubRunId: string;
  githubRunAttempt: number;
  projectId?: string;
  ciBuildId?: string;
}

interface RunCancellationResponse {
  status: string;
  data: any;
}

const handler = async ({
  githubRunId,
  githubRunAttempt,
  projectId,
  ciBuildId,
}: z.infer<typeof zodSchema>) => {
  logger.info(
    `Cancelling run by GitHub CI: workflow ${githubRunId}, attempt ${githubRunAttempt}`
  );

  const body: CancelRunGithubCIRequest = {
    githubRunId,
    githubRunAttempt,
  };

  if (projectId) {
    body.projectId = projectId;
  }

  if (ciBuildId) {
    body.ciBuildId = ciBuildId;
  }

  const result = await putApi<
    RunCancellationResponse,
    CancelRunGithubCIRequest
  >(`/runs/cancel-ci/github`, body);

  if (!result.ok) {
    return apiFailureResult('Failed to cancel run by GitHub CI', result);
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result.data, null, 2),
      },
    ],
  };
};

export const cancelRunByGithubCITool = {
  scope: 'runs:write',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;
