import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as request from '../../lib/request';
import { listWebhooksTool } from './list-webhooks';
import { getWebhookTool } from './get-webhook';
import { createWebhookTool } from './create-webhook';
import { updateWebhookTool } from './update-webhook';
import { deleteWebhookTool } from './delete-webhook';

/** The 403 the API answers with when the caller's key lacks webhook access. */
const refused = (
  method: request.ApiFailure['method'],
  path: string
): request.ApiFailure => ({
  ok: false,
  method,
  path,
  status: 403,
  body: { message: 'missing scope webhooks:read' },
});

const refusalText = (summary: string, method: string, path: string) =>
  `${summary}: ${method} ${path}: HTTP 403 {"message":"missing scope webhooks:read"}`;

vi.mock('../../lib/request');

describe('listWebhooksTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return formatted webhook data on success', async () => {
    const mockWebhooks = [
      {
        hookId: 'webhook-1',
        url: 'https://example.com/webhook1',
        hookEvents: ['RUN_FINISH'],
        label: 'Test Webhook 1',
      },
      {
        hookId: 'webhook-2',
        url: 'https://example.com/webhook2',
        hookEvents: ['RUN_START', 'RUN_FINISH'],
        label: 'Test Webhook 2',
      },
    ];

    vi.spyOn(request, 'fetchApi').mockResolvedValue({
      ok: true,
      data: mockWebhooks,
    });

    const result = await listWebhooksTool.handler({ projectId: 'project-123' });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockWebhooks, null, 2),
        },
      ],
    });
    expect(request.fetchApi).toHaveBeenCalledWith(
      '/webhooks?projectId=project-123'
    );
  });

  it('should return error message when API request fails', async () => {
    vi.spyOn(request, 'fetchApi').mockResolvedValue(
      refused('GET', '/webhooks?projectId=project-123')
    );

    const result = await listWebhooksTool.handler({ projectId: 'project-123' });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: refusalText(
            'Failed to retrieve webhooks',
            'GET',
            '/webhooks?projectId=project-123'
          ),
        },
      ],
    });
  });

  it('should have correct schema structure', () => {
    expect(listWebhooksTool.schema).toBeDefined();
    expect(listWebhooksTool.schema.shape.projectId).toBeDefined();
  });
});

describe('getWebhookTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return webhook data on success', async () => {
    const mockWebhook = {
      hookId: 'webhook-123',
      url: 'https://example.com/webhook',
      hookEvents: ['RUN_FINISH', 'RUN_START'],
      label: 'My Webhook',
      headers: '{"Authorization": "Bearer token"}',
    };

    vi.spyOn(request, 'fetchApi').mockResolvedValue({
      ok: true,
      data: mockWebhook,
    });

    const result = await getWebhookTool.handler({ hookId: 'webhook-123' });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockWebhook, null, 2),
        },
      ],
    });
    expect(request.fetchApi).toHaveBeenCalledWith('/webhooks/webhook-123');
  });

  it('should return error message when API request fails', async () => {
    vi.spyOn(request, 'fetchApi').mockResolvedValue(
      refused('GET', '/webhooks/webhook-123')
    );

    const result = await getWebhookTool.handler({ hookId: 'webhook-123' });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: refusalText(
            'Failed to retrieve webhook',
            'GET',
            '/webhooks/webhook-123'
          ),
        },
      ],
    });
  });

  it('should have correct schema structure', () => {
    expect(getWebhookTool.schema).toBeDefined();
    expect(getWebhookTool.schema.shape.hookId).toBeDefined();
  });
});

describe('createWebhookTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create webhook with required fields only', async () => {
    const mockResponse = {
      hookId: 'new-webhook-123',
      url: 'https://example.com/webhook',
      hookEvents: [],
    };

    vi.spyOn(request, 'postApi').mockResolvedValue({
      ok: true,
      data: mockResponse,
    });

    const result = await createWebhookTool.handler({
      projectId: 'project-123',
      url: 'https://example.com/webhook',
    });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    });
    expect(request.postApi).toHaveBeenCalledWith(
      '/webhooks?projectId=project-123',
      { url: 'https://example.com/webhook' }
    );
  });

  it('should create webhook with all optional fields', async () => {
    const mockResponse = {
      hookId: 'new-webhook-456',
      url: 'https://example.com/webhook',
      hookEvents: ['RUN_FINISH', 'RUN_START'],
      headers: '{"Authorization": "Bearer token"}',
      label: 'My Webhook',
    };

    vi.spyOn(request, 'postApi').mockResolvedValue({
      ok: true,
      data: mockResponse,
    });

    const result = await createWebhookTool.handler({
      projectId: 'project-123',
      url: 'https://example.com/webhook',
      headers: '{"Authorization": "Bearer token"}',
      hookEvents: ['RUN_FINISH', 'RUN_START'],
      label: 'My Webhook',
    });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    });
    expect(request.postApi).toHaveBeenCalledWith(
      '/webhooks?projectId=project-123',
      {
        url: 'https://example.com/webhook',
        headers: '{"Authorization": "Bearer token"}',
        hookEvents: ['RUN_FINISH', 'RUN_START'],
        label: 'My Webhook',
      }
    );
  });

  it('should return error message when API request fails', async () => {
    vi.spyOn(request, 'postApi').mockResolvedValue(
      refused('POST', '/webhooks?projectId=project-123')
    );

    const result = await createWebhookTool.handler({
      projectId: 'project-123',
      url: 'https://example.com/webhook',
    });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: refusalText(
            'Failed to create webhook',
            'POST',
            '/webhooks?projectId=project-123'
          ),
        },
      ],
    });
  });

  it('should have correct schema structure', () => {
    expect(createWebhookTool.schema).toBeDefined();
    expect(createWebhookTool.schema.shape.projectId).toBeDefined();
    expect(createWebhookTool.schema.shape.url).toBeDefined();
    expect(createWebhookTool.schema.shape.headers).toBeDefined();
    expect(createWebhookTool.schema.shape.hookEvents).toBeDefined();
    expect(createWebhookTool.schema.shape.label).toBeDefined();
  });
});

describe('updateWebhookTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update webhook with single field', async () => {
    const mockResponse = {
      hookId: 'webhook-123',
      url: 'https://example.com/new-webhook',
      hookEvents: ['RUN_FINISH'],
    };

    vi.spyOn(request, 'putApi').mockResolvedValue({
      ok: true,
      data: mockResponse,
    });

    const result = await updateWebhookTool.handler({
      hookId: 'webhook-123',
      url: 'https://example.com/new-webhook',
    });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    });
    expect(request.putApi).toHaveBeenCalledWith('/webhooks/webhook-123', {
      url: 'https://example.com/new-webhook',
    });
  });

  it('should update webhook with all fields', async () => {
    const mockResponse = {
      hookId: 'webhook-123',
      url: 'https://example.com/updated-webhook',
      hookEvents: ['RUN_START', 'RUN_TIMEOUT'],
      headers: '{"X-Custom": "value"}',
      label: 'Updated Webhook',
    };

    vi.spyOn(request, 'putApi').mockResolvedValue({
      ok: true,
      data: mockResponse,
    });

    const result = await updateWebhookTool.handler({
      hookId: 'webhook-123',
      url: 'https://example.com/updated-webhook',
      headers: '{"X-Custom": "value"}',
      hookEvents: ['RUN_START', 'RUN_TIMEOUT'],
      label: 'Updated Webhook',
    });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    });
    expect(request.putApi).toHaveBeenCalledWith('/webhooks/webhook-123', {
      url: 'https://example.com/updated-webhook',
      headers: '{"X-Custom": "value"}',
      hookEvents: ['RUN_START', 'RUN_TIMEOUT'],
      label: 'Updated Webhook',
    });
  });

  it('should reject update with hookId only (OpenAPI requires request body)', async () => {
    const result = await updateWebhookTool.handler({
      hookId: 'webhook-123',
    });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Error: At least one field to update must be provided (url, headers, hookEvents, or label).',
        },
      ],
    });
    expect(request.putApi).not.toHaveBeenCalled();
  });

  it('should return error message when API request fails', async () => {
    vi.spyOn(request, 'putApi').mockResolvedValue(
      refused('PUT', '/webhooks/webhook-123')
    );

    const result = await updateWebhookTool.handler({
      hookId: 'webhook-123',
      url: 'https://example.com/webhook',
    });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: refusalText(
            'Failed to update webhook',
            'PUT',
            '/webhooks/webhook-123'
          ),
        },
      ],
    });
  });

  it('should have correct schema structure', () => {
    expect(updateWebhookTool.schema).toBeDefined();
    expect(updateWebhookTool.schema.shape.hookId).toBeDefined();
    expect(updateWebhookTool.schema.shape.url).toBeDefined();
    expect(updateWebhookTool.schema.shape.headers).toBeDefined();
    expect(updateWebhookTool.schema.shape.hookEvents).toBeDefined();
    expect(updateWebhookTool.schema.shape.label).toBeDefined();
  });
});

describe('deleteWebhookTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete webhook successfully', async () => {
    const mockResponse = {};

    vi.spyOn(request, 'deleteApi').mockResolvedValue({
      ok: true,
      data: mockResponse,
    });

    const result = await deleteWebhookTool.handler({ hookId: 'webhook-123' });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    });
    expect(request.deleteApi).toHaveBeenCalledWith('/webhooks/webhook-123');
  });

  it('should delete webhook and return response data', async () => {
    const mockResponse = {
      deleted: true,
      hookId: 'webhook-123',
    };

    vi.spyOn(request, 'deleteApi').mockResolvedValue({
      ok: true,
      data: mockResponse,
    });

    const result = await deleteWebhookTool.handler({ hookId: 'webhook-123' });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    });
  });

  it('should return error message when API request fails', async () => {
    vi.spyOn(request, 'deleteApi').mockResolvedValue(
      refused('DELETE', '/webhooks/webhook-123')
    );

    const result = await deleteWebhookTool.handler({ hookId: 'webhook-123' });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: refusalText(
            'Failed to delete webhook',
            'DELETE',
            '/webhooks/webhook-123'
          ),
        },
      ],
    });
  });

  it('should have correct schema structure', () => {
    expect(deleteWebhookTool.schema).toBeDefined();
    expect(deleteWebhookTool.schema.shape.hookId).toBeDefined();
  });
});
