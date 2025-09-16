import { z } from "zod";
import { fetchApi } from "../../lib/request.js";

const zodSchema = z.object({
  instanceId: z
    .string()
    .describe("The instance ID to fetch debugging data from."),
});

const handler = async ({ instanceId }: z.infer<typeof zodSchema>) => {
  const instanceData = await fetchApi(`/instances/${instanceId}`);
  if (!instanceData) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve spec file instances",
        },
      ],
    };
  }
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(instanceData, null, 2),
      },
    ],
  };
};

export const getSpecInstancesTool = {
  schema: zodSchema.shape,
  handler,
};
