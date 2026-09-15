import { z } from 'zod';
import { putApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { uuidV4 } from '../../lib/schema';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  hookId: uuidV4().describe('The webhook ID (UUID).'),
  url: z
    .string()
    .max(2048)
    .optional()
    .describe('URL to send webhook POST requests to.'),
  headers: z
    .string()
    .max(4096)
    .optional()
    .nullable()
    .describe(
      'Custom headers as a JSON object string (e.g., {"Authorization": "Bearer token"}).'
    ),
  hookEvents: z
    .array(z.enum(['RUN_FINISH', 'RUN_START', 'RUN_TIMEOUT', 'RUN_CANCELED']))
    .optional()
    .describe(
      'Events that trigger this webhook. Options: RUN_FINISH (run completed), RUN_START (run started), RUN_TIMEOUT (run timed out), RUN_CANCELED (run was cancelled).'
    ),
  label: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .nullable()
    .describe('Human-readable label for the webhook.'),
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

  if (Object.keys(body).length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Error: At least one field to update must be provided (url, headers, hookEvents, or label).',
        },
      ],
    };
  }

  logger.info(`Updating webhook ${hookId}`);

  const result = await putApi(`/webhooks/${encodeURIComponent(hookId)}`, body);

  if (!result.ok) {
    return apiFailureResult('Failed to update webhook', result);
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

export const updateWebhookTool = {
  scope: 'webhooks:write',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;
