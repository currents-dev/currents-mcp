import { z } from "zod";
import { deleteApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  runId: z.string().describe("The run ID to delete."),
});

const handler = async ({ runId }: z.infer<typeof zodSchema>) => {
  logger.info(`Deleting run ${runId}`);

  const data = await deleteApi(`/runs/${runId}`);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to delete run",
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

export const deleteRunTool = {
  schema: zodSchema.shape,
  handler,
};
