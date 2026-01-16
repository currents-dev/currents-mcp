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

    vi.spyOn(request, "fetchCursorBasedPaginatedApi").mockResolvedValue(
      mockProjects
    );

    const result = await getProjectsTool.handler({ fetchAll: true });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(mockProjects, null, 2),
        },
      ],
    });
    expect(request.fetchCursorBasedPaginatedApi).toHaveBeenCalledWith(
      "/projects"
    );
  });

  it("should return error message when API request fails", async () => {
    vi.spyOn(request, "fetchCursorBasedPaginatedApi").mockResolvedValue(null);

    const result = await getProjectsTool.handler({ fetchAll: true });

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
});
