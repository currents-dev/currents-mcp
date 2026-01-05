import { z } from "zod";
import { postApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to generate the test signature for."),
  specFilePath: z
    .string()
    .describe("Full path to the spec file."),
  testTitle: z
    .union([z.string(), z.array(z.string()).min(1)])
    .describe("Test title or array of titles (for nested describe blocks)."),
});

interface SignatureRequest {
  projectId: string;
  specFilePath: string;
  testTitle: string | string[];
}

interface SignatureResponse {
  status: string;
  data: {
    signature: string;
  };
}

const handler = async ({
  projectId,
  specFilePath,
  testTitle,
}: z.infer<typeof zodSchema>) => {
  logger.info(
    `Generating test signature for project ${projectId}, spec ${specFilePath}, title ${JSON.stringify(testTitle)}`
  );

  const body: SignatureRequest = {
    projectId,
    specFilePath,
    testTitle,
  };

  const data = await postApi<SignatureResponse, SignatureRequest>(
    "/signature/test",
    body
  );

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to generate test signature",
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

export const getTestSignatureTool = {
  schema: zodSchema.shape,
  handler,
};
