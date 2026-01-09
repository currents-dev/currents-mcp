import { z } from "zod";
import { putApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  actionId: z
    .string()
    .describe("The action ID to update."),
  name: z
    .string()
    .optional()
    .describe("The name of the action."),
  type: z
    .enum(["skip", "quarantine", "tag"])
    .optional()
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
    .optional()
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

interface UpdateActionRequest {
  name?: string;
  type?: string;
  matcher?: {
    type: string;
    value: string | string[];
    operator?: string;
  };
  tags?: string[];
  reason?: string;
  expiresAt?: string;
}

const handler = async ({
  actionId,
  name,
  type,
  matcher,
  tags,
  reason,
  expiresAt,
}: z.infer<typeof zodSchema>) => {
  logger.info(`Updating action ${actionId}`);

  const body: UpdateActionRequest = {};
  if (name !== undefined) body.name = name;
  if (type !== undefined) body.type = type;
  if (matcher !== undefined) body.matcher = matcher;
  if (tags !== undefined) body.tags = tags;
  if (reason !== undefined) body.reason = reason;
  if (expiresAt !== undefined) body.expiresAt = expiresAt;

  const data = await putApi(`/actions/${actionId}`, body);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to update action",
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

export const updateActionTool = {
  schema: zodSchema.shape,
  handler,
};
