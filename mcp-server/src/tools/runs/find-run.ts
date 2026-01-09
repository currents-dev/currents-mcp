import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to search within."),
  ciBuildId: z
    .string()
    .optional()
    .describe("The CI build ID. If provided, returns the run with this exact ciBuildId."),
  branch: z
    .string()
    .optional()
    .describe("Git branch name. Used when ciBuildId is not provided."),
  tag: z
    .array(z.string())
    .optional()
    .describe("Run tags to filter by (can be specified multiple times)."),
  pwLastRun: z
    .boolean()
    .optional()
    .describe("If true, includes information about failed tests from the last run (Playwright only)."),
});

const handler = async ({
  projectId,
  ciBuildId,
  branch,
  tag,
  pwLastRun,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("projectId", projectId);

  if (ciBuildId) {
    queryParams.append("ciBuildId", ciBuildId);
  }

  if (branch) {
    queryParams.append("branch", branch);
  }

  if (tag && tag.length > 0) {
    tag.forEach((t) => queryParams.append("tag", t));
  }

  if (pwLastRun !== undefined) {
    queryParams.append("pwLastRun", pwLastRun.toString());
  }

  logger.info(`Finding run with query params: ${queryParams.toString()}`);

  const data = await fetchApi(`/runs/find?${queryParams.toString()}`);

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
