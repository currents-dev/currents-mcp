import { z } from "zod";
import { putApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

// Schemas for rule actions
const ruleActionSkipSchema = z.object({
  op: z.literal("skip"),
});

const ruleActionQuarantineSchema = z.object({
  op: z.literal("quarantine"),
});

const ruleActionTagSchema = z.object({
  op: z.literal("tag"),
  details: z.object({
    tags: z.array(z.string()).max(10).describe("Tags to add to matching tests"),
  }),
});

const ruleActionSchema = z.union([
  ruleActionSkipSchema,
  ruleActionQuarantineSchema,
  ruleActionTagSchema,
]);

// Schema for matcher condition
const ruleMatcherConditionSchema = z.object({
  type: z.enum([
    "testId",
    "project",
    "title",
    "file",
    "git_branch",
    "git_authorName",
    "git_authorEmail",
    "git_remoteOrigin",
    "git_message",
    "error_message",
    "titlePath",
    "annotation",
    "tag",
  ]),
  op: z.enum([
    "eq",
    "neq",
    "any",
    "empty",
    "in",
    "notIn",
    "inc",
    "notInc",
    "incAll",
    "notIncAll",
  ]),
  value: z.union([z.string(), z.array(z.string())]).optional().nullable(),
});

// Schema for matcher
const ruleMatcherSchema = z.object({
  op: z.enum(["AND", "OR"]),
  cond: z.array(ruleMatcherConditionSchema).min(1),
});

const zodSchema = z.object({
  actionId: z.string().describe("The action ID to update."),
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe("Human-readable name for the action."),
  description: z
    .string()
    .max(1000)
    .optional()
    .nullable()
    .describe("Optional description of the action."),
  action: z
    .array(ruleActionSchema)
    .min(1)
    .optional()
    .describe("Actions to perform when conditions match."),
  matcher: ruleMatcherSchema
    .optional()
    .describe("Matcher defining which tests the action applies to."),
  expiresAfter: z
    .string()
    .optional()
    .nullable()
    .describe("Optional expiration date in ISO 8601 format."),
});

interface UpdateActionRequest {
  name?: string;
  description?: string | null;
  action?: any[];
  matcher?: any;
  expiresAfter?: string | null;
}

const handler = async ({
  actionId,
  name,
  description,
  action,
  matcher,
  expiresAfter,
}: z.infer<typeof zodSchema>) => {
  logger.info(`Updating action ${actionId}`);

  const body: UpdateActionRequest = {};

  if (name !== undefined) {
    body.name = name;
  }

  if (description !== undefined) {
    body.description = description;
  }

  if (action !== undefined) {
    body.action = action;
  }

  if (matcher !== undefined) {
    body.matcher = matcher;
  }

  if (expiresAfter !== undefined) {
    body.expiresAfter = expiresAfter;
  }

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
