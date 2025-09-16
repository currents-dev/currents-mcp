import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { InstanceData } from "../../types.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z.string(),
  spec: z.string().describe("The spec name the test belongs to."),
  title: z.string().describe("The test name."),
});

const handler = async ({
  projectId,
  spec,
  title,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append(
    "date_start",
    new Date(new Date().setDate(new Date().getDate() - 365)).toISOString()
  );
  queryParams.append("date_end", new Date().toISOString());
  queryParams.append("spec", spec);
  queryParams.append("title", title);

  logger.info(
    `Fetching test signature for project ${projectId} with query params: ${queryParams.toString()}`
  );

  const data = await fetchApi<InstanceData>(
    `/tests/${projectId}?${queryParams.toString()}`
  );

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve project spec files",
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

export const findTestSignatureTool = {
  schema: zodSchema.shape,
  handler,
};
