import { z } from "zod";
import { postApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to search within."),
  ciBuildId: z
    .string()
    .describe("The CI build ID to search for."),
});

interface FindRunRequest {
  projectId: string;
  ciBuildId: string;
}

const handler = async ({
  projectId,
  ciBuildId,
}: z.infer<typeof zodSchema>) => {
  logger.info(`Finding run with ciBuildId ${ciBuildId} in project ${projectId}`);

  const body: FindRunRequest = {
    projectId,
    ciBuildId,
  };

  const data = await postApi("/runs/find", body);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to find run",
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

export const findRunTool = {
  schema: zodSchema.shape,
  handler,
};
