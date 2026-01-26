import { z } from "zod";
import { postApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to create the webhook for."),
  url: z
    .string()
    .max(2048)
    .describe("URL to send webhook POST requests to."),
  headers: z
    .string()
    .max(4096)
    .optional()
    .describe("Custom headers as a JSON object string (e.g., {\"Authorization\": \"Bearer token\"})."),
  hookEvents: z
    .array(z.enum(["RUN_FINISH", "RUN_START", "RUN_TIMEOUT", "RUN_CANCELED"]))
    .optional()
    .describe("Events that trigger this webhook. Options: RUN_FINISH (run completed), RUN_START (run started), RUN_TIMEOUT (run timed out), RUN_CANCELED (run was cancelled)."),
  label: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe("Human-readable label for the webhook."),
});

const handler = async ({
  projectId,
  url,
  headers,
  hookEvents,
  label,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("projectId", projectId);

  const body: Record<string, unknown> = {
    url,
  };

  if (headers !== undefined) {
    body.headers = headers;
  }

  if (hookEvents !== undefined) {
    body.hookEvents = hookEvents;
  }

  if (label !== undefined) {
    body.label = label;
  }

  logger.info(
    `Creating webhook for project ${projectId}`
  );

  const data = await postApi(
    `/webhooks?${queryParams.toString()}`,
    body
  );

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to create webhook",
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

export const createWebhookTool = {
  schema: zodSchema.shape,
  handler,
};
