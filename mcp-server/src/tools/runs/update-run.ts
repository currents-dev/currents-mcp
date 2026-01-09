import { z } from "zod";
import { putApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  runId: z
    .string()
    .describe("The run ID to update."),
  tags: z
    .array(z.string())
    .optional()
    .describe("Tags to update for the run."),
  ci: z
    .object({
      ciBuildId: z.string().optional(),
      branch: z.string().optional(),
      message: z.string().optional(),
      author: z.string().optional(),
    })
    .optional()
    .describe("CI information to update."),
});

interface UpdateRunRequest {
  tags?: string[];
  ci?: {
    ciBuildId?: string;
    branch?: string;
    message?: string;
    author?: string;
  };
}

const handler = async ({
  runId,
  tags,
  ci,
}: z.infer<typeof zodSchema>) => {
  logger.info(`Updating run ${runId}`);

  const body: UpdateRunRequest = {};
  if (tags !== undefined) body.tags = tags;
  if (ci !== undefined) body.ci = ci;

  const data = await putApi(`/runs/${runId}`, body);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to update run",
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

export const updateRunTool = {
  schema: zodSchema.shape,
  handler,
};
