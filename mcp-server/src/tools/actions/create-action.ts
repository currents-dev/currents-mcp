import { z } from "zod";
import { postApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to create the action in."),
  name: z
    .string()
    .describe("The name of the action."),
  type: z
    .enum(["skip", "quarantine", "tag"])
    .describe("The type of action: skip, quarantine, or tag."),
  matcher: z
    .object({
      type: z
        .enum(["title", "file", "tag", "branch", "author", "group"])
        .describe("The type of matcher."),
      value: z
        .union([z.string(), z.array(z.string())])
        .describe("The value(s) to match."),
      operator: z
        .enum(["equals", "contains", "startsWith", "endsWith", "regex"])
        .optional()
        .describe("The operator for matching (default: contains)."),
    })
    .describe("The matcher configuration that defines which tests the action applies to."),
  tags: z
    .array(z.string())
    .optional()
    .describe("Tags to apply when action type is 'tag'."),
  reason: z
    .string()
    .optional()
    .describe("Optional reason or description for the action."),
  expiresAt: z
    .string()
    .optional()
    .describe("Optional expiration date in ISO 8601 format."),
});

interface CreateActionRequest {
  name: string;
  type: string;
  matcher: {
    type: string;
    value: string | string[];
    operator?: string;
  };
  tags?: string[];
  reason?: string;
  expiresAt?: string;
}

const handler = async ({
  projectId,
  name,
  type,
  matcher,
  tags,
  reason,
  expiresAt,
}: z.infer<typeof zodSchema>) => {
  logger.info(`Creating action for project ${projectId}: ${name}`);

  const body: CreateActionRequest = {
    name,
    type,
    matcher,
    tags,
    reason,
    expiresAt,
  };

  const data = await postApi(
    `/actions?projectId=${projectId}`,
    body
  );

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to create action",
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

export const createActionTool = {
  schema: zodSchema.shape,
  handler,
};
