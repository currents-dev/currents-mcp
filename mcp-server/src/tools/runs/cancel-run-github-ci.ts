import { z } from "zod";
import { putApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  githubRunId: z
    .string()
    .describe("GitHub Actions workflow run ID."),
  githubRunAttempt: z
    .number()
    .describe("GitHub Actions workflow run attempt number."),
  projectId: z
    .string()
    .optional()
    .describe("Optional project ID to scope the cancellation."),
  ciBuildId: z
    .string()
    .optional()
    .describe("Optional CI build ID to scope the cancellation."),
});

interface CancelRunGithubCIRequest {
  githubRunId: string;
  githubRunAttempt: number;
  projectId?: string;
  ciBuildId?: string;
}

const handler = async ({
  githubRunId,
  githubRunAttempt,
  projectId,
  ciBuildId,
}: z.infer<typeof zodSchema>) => {
  logger.info(
    `Cancelling run by GitHub CI: runId=${githubRunId}, attempt=${githubRunAttempt}`
  );

  const body: CancelRunGithubCIRequest = {
    githubRunId,
    githubRunAttempt,
  };

  if (projectId) {
    body.projectId = projectId;
  }

  if (ciBuildId) {
    body.ciBuildId = ciBuildId;
  }

  const data = await putApi(`/runs/cancel-ci/github`, body);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to cancel run by GitHub CI",
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

export const cancelRunGithubCITool = {
  schema: zodSchema.shape,
  handler,
};
