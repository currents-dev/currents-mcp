import { z } from "zod";
import { putApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  hookId: z
    .string()
    .describe("The webhook ID (UUID)."),
  url: z
    .string()
    .max(2048)
    .optional()
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
  hookId,
  url,
  headers,
  hookEvents,
  label,
}: z.infer<typeof zodSchema>) => {
  const body: Record<string, unknown> = {};

  if (url !== undefined) {
    body.url = url;
  }

  if (headers !== undefined) {
    body.headers = headers;
  }

  if (hookEvents !== undefined) {
    body.hookEvents = hookEvents;
  }

  if (label !== undefined) {
    body.label = label;
  }

  logger.info(`Updating webhook ${hookId}`);

  const data = await putApi(`/webhooks/${hookId}`, body);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to update webhook",
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

export const updateWebhookTool = {
  schema: zodSchema.shape,
  handler,
};
