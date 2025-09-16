import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { RunResponse } from "../../types.js";

const zodSchema = z.object({
  runId: z.string().describe("The run ID to fetch details for."),
});

const handler = async ({ runId }: z.infer<typeof zodSchema>) => {
  const runData = await fetchApi<RunResponse>(`/runs/${runId}`);

  if (!runData) {
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
        text: JSON.stringify(runData, null, 2),
      },
    ],
  };
};

export const getRunDetailsTool = {
  schema: zodSchema.shape,
  handler,
};
