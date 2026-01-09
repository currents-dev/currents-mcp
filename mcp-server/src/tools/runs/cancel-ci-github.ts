import { z } from "zod";
import { postApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  owner: z
    .string()
    .describe("The GitHub repository owner."),
  repo: z
    .string()
    .describe("The GitHub repository name."),
  runId: z
    .number()
    .describe("The GitHub Actions run ID."),
});

interface CancelCiGithubRequest {
  owner: string;
  repo: string;
  runId: number;
}

const handler = async ({
  owner,
  repo,
  runId,
}: z.infer<typeof zodSchema>) => {
  logger.info(`Canceling GitHub Actions run ${runId} for ${owner}/${repo}`);

  const body: CancelCiGithubRequest = {
    owner,
    repo,
    runId,
  };

  const data = await postApi("/runs/cancel-ci/github", body);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to cancel GitHub Actions run",
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

export const cancelCiGithubTool = {
  schema: zodSchema.shape,
  handler,
};
