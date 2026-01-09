import { z } from "zod";
import { deleteApi } from "../../lib/request.js";

const zodSchema = z.object({
  runId: z.string().describe("The run ID to delete."),
});

const handler = async ({ runId }: z.infer<typeof zodSchema>) => {
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
