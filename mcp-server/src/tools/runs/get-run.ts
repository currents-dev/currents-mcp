import { z } from "zod";
import { fetchApi } from "../../lib/request.js";

const zodSchema = z.object({
  runId: z.string().describe("The run ID to fetch details for."),
});

const handler = async ({ runId }: z.infer<typeof zodSchema>) => {
  const data = await fetchApi(`/runs/${runId}`);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve run data",
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

export const getRunDetailsTool = {
  schema: zodSchema.shape,
  handler,
};
