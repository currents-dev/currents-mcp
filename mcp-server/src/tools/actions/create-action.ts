import { z } from "zod";
import { postApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

// Define condition type and operator enums
const ConditionType = z.enum([
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
]);

const ConditionOperator = z.enum([
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
]);

// Define rule action schemas
const RuleActionSkip = z.object({
  op: z.literal("skip"),
});

const RuleActionQuarantine = z.object({
  op: z.literal("quarantine"),
});

const RuleActionTag = z.object({
  op: z.literal("tag"),
  details: z.object({
    tags: z.array(z.string()).max(10).describe("Tags to add to matching tests"),
  }),
});

const RuleAction = z.union([RuleActionSkip, RuleActionQuarantine, RuleActionTag]);

// Define matcher condition schema
const RuleMatcherCondition = z.object({
  type: ConditionType,
  op: ConditionOperator,
  value: z.union([z.string(), z.array(z.string())]).optional().nullable(),
});

// Define matcher schema
const RuleMatcher = z.object({
  op: z.enum(["AND", "OR"]).describe("How to combine multiple conditions"),
  cond: z.array(RuleMatcherCondition).min(1).describe("List of conditions to match"),
});

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to create the action for."),
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
    .describe("Optional description for the action."),
  action: z
    .array(RuleAction)
    .min(1)
    .describe("Actions to perform when conditions match."),
  matcher: RuleMatcher.describe("Matcher defining which tests this action applies to."),
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

interface ActionResponse {
  status: string;
  data: any;
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
    description,
    action,
    matcher,
    expiresAfter,
  };

  const queryParams = new URLSearchParams();
  queryParams.append("projectId", projectId);

  const data = await postApi<ActionResponse, CreateActionRequest>(
    `/actions?${queryParams.toString()}`,
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
