import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { InstanceData } from "../../types.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  signature: z.string().describe("The test signature."),
  tags: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Filter results by test tags."),
  branches: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Filter results by git branches."),
  authors: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Filter results by git authors."),
  status: z
    .enum(["failed", "passed", "skipped", "pending"])
    .optional()
    .describe("Filter results by test execution status."),
});

const handler = async ({
  signature,
  tags,
  branches,
  authors,
  status,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append(
    "date_start",
    new Date(new Date().setDate(new Date().getDate() - 365)).toISOString()
  );
  queryParams.append("date_end", new Date().toISOString());
  queryParams.append("limit", "20");

  if (status) {
    queryParams.append("status", status);
  }

  if (tags.length > 0) {
    queryParams.append("tag", tags.join("&tag[]="));
  }

  if (branches.length > 0) {
    queryParams.append("branch", branches.join("&branch[]="));
  }

  if (authors.length > 0) {
    queryParams.append("git_author", authors.join("&git_author[]="));
  }

  logger.info(
    `Fetching test results for test ${signature} with query params: ${queryParams.toString()}`
  );

  const data = await fetchApi<InstanceData>(
    `/test-results/${signature}?${queryParams.toString()}`
  );

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve test results",
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

export const getTestResultsTool = {
  schema: zodSchema.shape,
  handler,
};
