import { beforeEach, describe, expect, it, vi } from "vitest";
import * as request from "../../lib/request.js";
import { listWebhooksTool } from "./list-webhooks.js";
import { getWebhookTool } from "./get-webhook.js";
import { createWebhookTool } from "./create-webhook.js";
import { updateWebhookTool } from "./update-webhook.js";
import { deleteWebhookTool } from "./delete-webhook.js";

vi.mock("../../lib/request.js");

describe("listWebhooksTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return formatted webhook data on success", async () => {
    const mockWebhooks = [
      {
        hookId: "webhook-1",
        url: "https://example.com/webhook1",
        hookEvents: ["RUN_FINISH"],
        label: "Test Webhook 1",
      },
      {
        hookId: "webhook-2",
        url: "https://example.com/webhook2",
        hookEvents: ["RUN_START", "RUN_FINISH"],
        label: "Test Webhook 2",
      },
    ];

    vi.spyOn(request, "fetchApi").mockResolvedValue(mockWebhooks);

    const result = await listWebhooksTool.handler({ projectId: "project-123" });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(mockWebhooks, null, 2),
        },
      ],
    });
    expect(request.fetchApi).toHaveBeenCalledWith(
      "/webhooks?projectId=project-123"
    );
  });

  it("should return error message when API request fails", async () => {
    vi.spyOn(request, "fetchApi").mockResolvedValue(null);

    const result = await listWebhooksTool.handler({ projectId: "project-123" });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "Failed to retrieve webhooks",
        },
      ],
    });
  });

  it("should have correct schema structure", () => {
    expect(listWebhooksTool.schema).toBeDefined();
    expect(listWebhooksTool.schema.projectId).toBeDefined();
  });
});

describe("getWebhookTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return webhook data on success", async () => {
    const mockWebhook = {
      hookId: "webhook-123",
      url: "https://example.com/webhook",
      hookEvents: ["RUN_FINISH", "RUN_START"],
      label: "My Webhook",
      headers: '{"Authorization": "Bearer token"}',
    };

    vi.spyOn(request, "fetchApi").mockResolvedValue(mockWebhook);

    const result = await getWebhookTool.handler({ hookId: "webhook-123" });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(mockWebhook, null, 2),
        },
      ],
    });
    expect(request.fetchApi).toHaveBeenCalledWith("/webhooks/webhook-123");
  });

  it("should return error message when API request fails", async () => {
    vi.spyOn(request, "fetchApi").mockResolvedValue(null);

    const result = await getWebhookTool.handler({ hookId: "webhook-123" });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "Failed to retrieve webhook",
        },
      ],
    });
  });

  it("should have correct schema structure", () => {
    expect(getWebhookTool.schema).toBeDefined();
    expect(getWebhookTool.schema.hookId).toBeDefined();
  });
});

describe("createWebhookTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create webhook with required fields only", async () => {
    const mockResponse = {
      hookId: "new-webhook-123",
      url: "https://example.com/webhook",
      hookEvents: [],
    };

    vi.spyOn(request, "postApi").mockResolvedValue(mockResponse);

    const result = await createWebhookTool.handler({
      projectId: "project-123",
      url: "https://example.com/webhook",
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    });
    expect(request.postApi).toHaveBeenCalledWith(
      "/webhooks?projectId=project-123",
      { url: "https://example.com/webhook" }
    );
  });

  it("should create webhook with all optional fields", async () => {
    const mockResponse = {
      hookId: "new-webhook-456",
      url: "https://example.com/webhook",
      hookEvents: ["RUN_FINISH", "RUN_START"],
      headers: '{"Authorization": "Bearer token"}',
      label: "My Webhook",
    };

    vi.spyOn(request, "postApi").mockResolvedValue(mockResponse);

    const result = await createWebhookTool.handler({
      projectId: "project-123",
      url: "https://example.com/webhook",
      headers: '{"Authorization": "Bearer token"}',
      hookEvents: ["RUN_FINISH", "RUN_START"],
      label: "My Webhook",
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    });
    expect(request.postApi).toHaveBeenCalledWith(
      "/webhooks?projectId=project-123",
      {
        url: "https://example.com/webhook",
        headers: '{"Authorization": "Bearer token"}',
        hookEvents: ["RUN_FINISH", "RUN_START"],
        label: "My Webhook",
      }
    );
  });

  it("should return error message when API request fails", async () => {
    vi.spyOn(request, "postApi").mockResolvedValue(null);

    const result = await createWebhookTool.handler({
      projectId: "project-123",
      url: "https://example.com/webhook",
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "Failed to create webhook",
        },
      ],
    });
  });

  it("should have correct schema structure", () => {
    expect(createWebhookTool.schema).toBeDefined();
    expect(createWebhookTool.schema.projectId).toBeDefined();
    expect(createWebhookTool.schema.url).toBeDefined();
    expect(createWebhookTool.schema.headers).toBeDefined();
    expect(createWebhookTool.schema.hookEvents).toBeDefined();
    expect(createWebhookTool.schema.label).toBeDefined();
  });
});

describe("updateWebhookTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update webhook with single field", async () => {
    const mockResponse = {
      hookId: "webhook-123",
      url: "https://example.com/new-webhook",
      hookEvents: ["RUN_FINISH"],
    };

    vi.spyOn(request, "putApi").mockResolvedValue(mockResponse);

    const result = await updateWebhookTool.handler({
      hookId: "webhook-123",
      url: "https://example.com/new-webhook",
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    });
    expect(request.putApi).toHaveBeenCalledWith("/webhooks/webhook-123", {
      url: "https://example.com/new-webhook",
    });
  });

  it("should update webhook with all fields", async () => {
    const mockResponse = {
      hookId: "webhook-123",
      url: "https://example.com/updated-webhook",
      hookEvents: ["RUN_START", "RUN_TIMEOUT"],
      headers: '{"X-Custom": "value"}',
      label: "Updated Webhook",
    };

    vi.spyOn(request, "putApi").mockResolvedValue(mockResponse);

    const result = await updateWebhookTool.handler({
      hookId: "webhook-123",
      url: "https://example.com/updated-webhook",
      headers: '{"X-Custom": "value"}',
      hookEvents: ["RUN_START", "RUN_TIMEOUT"],
      label: "Updated Webhook",
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    });
    expect(request.putApi).toHaveBeenCalledWith("/webhooks/webhook-123", {
      url: "https://example.com/updated-webhook",
      headers: '{"X-Custom": "value"}',
      hookEvents: ["RUN_START", "RUN_TIMEOUT"],
      label: "Updated Webhook",
    });
  });

  it("should update webhook with hookId only (no changes)", async () => {
    const mockResponse = {
      hookId: "webhook-123",
      url: "https://example.com/webhook",
    };

    vi.spyOn(request, "putApi").mockResolvedValue(mockResponse);

    const result = await updateWebhookTool.handler({
      hookId: "webhook-123",
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    });
    expect(request.putApi).toHaveBeenCalledWith("/webhooks/webhook-123", {});
  });

  it("should return error message when API request fails", async () => {
    vi.spyOn(request, "putApi").mockResolvedValue(null);

    const result = await updateWebhookTool.handler({
      hookId: "webhook-123",
      url: "https://example.com/webhook",
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "Failed to update webhook",
        },
      ],
    });
  });

  it("should have correct schema structure", () => {
    expect(updateWebhookTool.schema).toBeDefined();
    expect(updateWebhookTool.schema.hookId).toBeDefined();
    expect(updateWebhookTool.schema.url).toBeDefined();
    expect(updateWebhookTool.schema.headers).toBeDefined();
    expect(updateWebhookTool.schema.hookEvents).toBeDefined();
    expect(updateWebhookTool.schema.label).toBeDefined();
  });
});

describe("deleteWebhookTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete webhook successfully", async () => {
    const mockResponse = {};

    vi.spyOn(request, "deleteApi").mockResolvedValue(mockResponse);

    const result = await deleteWebhookTool.handler({ hookId: "webhook-123" });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    });
    expect(request.deleteApi).toHaveBeenCalledWith("/webhooks/webhook-123");
  });

  it("should delete webhook and return response data", async () => {
    const mockResponse = {
      deleted: true,
      hookId: "webhook-123",
    };

    vi.spyOn(request, "deleteApi").mockResolvedValue(mockResponse);

    const result = await deleteWebhookTool.handler({ hookId: "webhook-123" });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    });
  });

  it("should return error message when API request fails", async () => {
    vi.spyOn(request, "deleteApi").mockResolvedValue(null);

    const result = await deleteWebhookTool.handler({ hookId: "webhook-123" });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "Failed to delete webhook",
        },
      ],
    });
  });

  it("should have correct schema structure", () => {
    expect(deleteWebhookTool.schema).toBeDefined();
    expect(deleteWebhookTool.schema.hookId).toBeDefined();
  });
});
