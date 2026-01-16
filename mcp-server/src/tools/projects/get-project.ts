import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z.string().describe("The project ID to fetch details for."),
});

const handler = async ({ projectId }: z.infer<typeof zodSchema>) => {
  logger.info(`Fetching project ${projectId}`);

  const data = await fetchApi(`/projects/${projectId}`);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve project",
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

export const getProjectTool = {
  schema: zodSchema.shape,
  handler,
};
