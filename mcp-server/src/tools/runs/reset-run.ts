import { z } from "zod";
import { putApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  runId: z.string().describe("The run ID to reset."),
  machineId: z
    .array(z.string())
    .min(1)
    .max(63)
    .describe("Machine ID(s) to reset."),
  isBatchedOr8n: z
    .boolean()
    .optional()
    .describe("Whether to use batched orchestration."),
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
  logger.info(`Resetting run ${runId} for machines: ${machineId.join(", ")}`);

  const body: ResetRunRequest = {
    machineId,
  };

  if (isBatchedOr8n !== undefined) {
    body.isBatchedOr8n = isBatchedOr8n;
  }

  const data = await putApi<ResetRunResponse, ResetRunRequest>(
    `/runs/${runId}/reset`,
    body
  );

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to reset run",
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
};

export const resetRunTool = {
  schema: zodSchema.shape,
  handler,
};
