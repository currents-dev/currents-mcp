import { z } from "zod";
import { deleteApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  actionId: z
    .string()
    .describe("The action ID to delete (archive)."),
});

const handler = async ({ actionId }: z.infer<typeof zodSchema>) => {
  logger.info(`Deleting action ${actionId}`);

  const data = await deleteApi(`/actions/${actionId}`);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to delete action",
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

export const deleteActionTool = {
  schema: zodSchema.shape,
  handler,
};
