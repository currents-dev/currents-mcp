import { beforeEach, describe, expect, it, vi } from "vitest";
import * as request from "../../lib/request.js";
import { getProjectsTool } from "./get-projects.js";

vi.mock("../../lib/request.js");

describe("getProjectsTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return formatted project data on success", async () => {
    const mockProjects = [
      { id: "1", name: "Project 1", cursor: "cursor1" },
      { id: "2", name: "Project 2", cursor: "cursor2" },
    ];

    const mockResponse = {
      status: "OK",
      has_more: false,
      data: mockProjects,
    };

    vi.spyOn(request, "fetchApi").mockResolvedValue(mockResponse);

    const result = await getProjectsTool.handler({});

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    });
    expect(request.fetchApi).toHaveBeenCalledWith("/projects");
  });

  it("should return error message when API request fails", async () => {
    vi.spyOn(request, "fetchApi").mockResolvedValue(null);

    const result = await getProjectsTool.handler({});

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "Failed to retrieve projects",
        },
      ],
    });
  });

  it("should have correct schema structure", () => {
    expect(getProjectsTool.schema).toBeDefined();
    expect(typeof getProjectsTool.schema).toBe("object");
  });

  it("should support pagination parameters", async () => {
    const mockResponse = {
      status: "OK",
      has_more: true,
      data: [],
    };

    vi.spyOn(request, "fetchApi").mockResolvedValue(mockResponse);

    await getProjectsTool.handler({
      limit: 50,
      starting_after: "cursor123",
    });

    expect(request.fetchApi).toHaveBeenCalledWith(
      "/projects?limit=50&starting_after=cursor123"
    );
  });
});
