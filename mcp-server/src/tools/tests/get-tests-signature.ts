import { z } from 'zod';
import { postApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  projectId: z
    .string()
    .min(1)
    .describe('The project ID to generate the test signature for.'),
  specFilePath: z.string().describe('Full path to the spec file.'),
  testTitle: z
    .union([z.string(), z.array(z.string()).min(1)])
    .describe('Test title or array of titles (for nested describe blocks).'),
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

  const result = await postApi<SignatureResponse, SignatureRequest>(
    '/signature/test',
    body
  );

  if (!result.ok) {
    // A POST that reads nothing and writes nothing: the signature is derived
    // from the body it was sent.
    return apiFailureResult('Failed to generate test signature', result, {
      safeToRepeat: true,
    });
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result.data, null, 2),
      },
    ],
  };
};

export const getTestSignatureTool = {
  scope: 'any',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;
