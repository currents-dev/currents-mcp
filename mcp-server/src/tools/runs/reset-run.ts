import { z } from 'zod';
import { putApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  runId: z.string().min(1).describe('The run ID to reset.'),
  machineId: z
    .array(z.string().min(1))
    .min(1)
    .max(63)
    .describe('Machine ID(s) to reset.'),
  isBatchedOr8n: z
    .boolean()
    .optional()
    .describe('Whether to use batched orchestration.'),
});

interface ResetRunRequest {
  machineId: string[];
  isBatchedOr8n?: boolean;
}

interface ResetRunResponse {
  status: string;
  data: any;
}

const handler = async ({
  runId,
  machineId,
  isBatchedOr8n,
}: z.infer<typeof zodSchema>) => {
  logger.info(`Resetting run ${runId} for machines: ${machineId.join(', ')}`);

  const body: ResetRunRequest = {
    machineId,
  };

  if (isBatchedOr8n !== undefined) {
    body.isBatchedOr8n = isBatchedOr8n;
  }

  const result = await putApi<ResetRunResponse, ResetRunRequest>(
    `/runs/${encodeURIComponent(runId)}/reset`,
    body
  );

  if (!result.ok) {
    return apiFailureResult('Failed to reset run', result);
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

export const resetRunTool = {
  scope: 'runs:write',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;
