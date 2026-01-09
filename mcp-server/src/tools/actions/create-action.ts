import { z } from "zod";
import { postApi } from "../../lib/request.js";
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
  projectId: z
    .string()
    .describe("The project ID to create the action in."),
  name: z
    .string()
    .min(1)
    .max(255)
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
    .describe("Actions to perform when conditions match."),
  matcher: ruleMatcherSchema.describe("Matcher defining which tests the action applies to."),
  expiresAfter: z
    .string()
    .optional()
    .nullable()
    .describe("Optional expiration date in ISO 8601 format."),
});

interface CreateActionRequest {
  name: string;
  description?: string | null;
  action: any[];
  matcher: any;
  expiresAfter?: string | null;
}

const handler = async ({
  projectId,
  name,
  description,
  action,
  matcher,
  expiresAfter,
}: z.infer<typeof zodSchema>) => {
  logger.info(`Creating action for project ${projectId}: ${name}`);

  const body: CreateActionRequest = {
    name,
    action,
    matcher,
  };

  if (description !== undefined) {
    body.description = description;
  }

  if (expiresAfter !== undefined) {
    body.expiresAfter = expiresAfter;
  }

  const data = await postApi(
    `/actions?projectId=${encodeURIComponent(projectId)}`,
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
