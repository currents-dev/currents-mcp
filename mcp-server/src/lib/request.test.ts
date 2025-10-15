import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchApi, fetchCursorBasedPaginatedApi } from "./request.js";

// Mock the env module
vi.mock("./env.js", () => ({
  CURRENTS_API_KEY: "test-api-key",
  CURRENTS_API_URL: "https://api.test.com",
}));

// Mock the logger module
vi.mock("./logger.js", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("fetchApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully fetch data from the API", async () => {
    const mockData = { id: 1, name: "Test" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await fetchApi<typeof mockData>("/test-path");

    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.test.com/test-path",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      })
    );
  });

  it("should return null on HTTP error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await fetchApi("/not-found");

    expect(result).toBeNull();
  });

  it("should return null on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await fetchApi("/test-path");

    expect(result).toBeNull();
  });
});

describe("fetchCursorBasedPaginatedApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch all pages when pagination is present", async () => {
    const page1 = {
      status: "ok",
      has_more: true,
      data: [{ id: 1, cursor: "cursor1" }],
    };
    const page2 = {
      status: "ok",
      has_more: false,
      data: [{ id: 2, cursor: "cursor2" }],
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => page1,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => page2,
      });

    const result = await fetchCursorBasedPaginatedApi("/test-path");

    expect(result).toEqual([
      { id: 1, cursor: "cursor1" },
      { id: 2, cursor: "cursor2" },
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("should handle single page response", async () => {
    const page = {
      status: "ok",
      has_more: false,
      data: [{ id: 1 }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => page,
    });

    const result = await fetchCursorBasedPaginatedApi("/test-path");

    expect(result).toEqual([{ id: 1 }]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("should return null on API error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await fetchCursorBasedPaginatedApi("/test-path");

    expect(result).toBeNull();
  });

  it("should stop after 100 iterations to prevent infinite loops", async () => {
    const page = {
      status: "ok",
      has_more: true,
      data: [{ id: 1, cursor: "cursor1" }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => page,
    });

    const result = await fetchCursorBasedPaginatedApi("/test-path");

    expect(global.fetch).toHaveBeenCalledTimes(101);
    expect(result).toHaveLength(101);
  });

  describe("cursor-based pagination unrolling", () => {
    it("should correctly pass starting_after cursor in subsequent requests", async () => {
      const page1 = {
        status: "ok",
        has_more: true,
        data: [
          { id: "item1", name: "First Item", cursor: "cursor_abc123" },
          { id: "item2", name: "Second Item", cursor: "cursor_def456" },
        ],
      };

      const page2 = {
        status: "ok",
        has_more: true,
        data: [
          { id: "item3", name: "Third Item", cursor: "cursor_ghi789" },
          { id: "item4", name: "Fourth Item", cursor: "cursor_jkl012" },
        ],
      };

      const page3 = {
        status: "ok",
        has_more: false,
        data: [{ id: "item5", name: "Fifth Item", cursor: "cursor_mno345" }],
      };

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page2,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page3,
        });

      global.fetch = fetchMock;

      const result = await fetchCursorBasedPaginatedApi("/projects");

      // Verify the result contains all items from all pages
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        { id: "item1", name: "First Item", cursor: "cursor_abc123" },
        { id: "item2", name: "Second Item", cursor: "cursor_def456" },
        { id: "item3", name: "Third Item", cursor: "cursor_ghi789" },
        { id: "item4", name: "Fourth Item", cursor: "cursor_jkl012" },
        { id: "item5", name: "Fifth Item", cursor: "cursor_mno345" },
      ]);

      // Verify pagination calls
      expect(fetchMock).toHaveBeenCalledTimes(3);

      // First call should not have starting_after parameter
      expect(fetchMock.mock.calls[0][0]).toBe("https://api.test.com/projects");

      // Second call should use the cursor from the last item of page 1
      expect(fetchMock.mock.calls[1][0]).toBe(
        "https://api.test.com/projects?starting_after=cursor_def456"
      );

      // Third call should use the cursor from the last item of page 2
      expect(fetchMock.mock.calls[2][0]).toBe(
        "https://api.test.com/projects?starting_after=cursor_jkl012"
      );
    });

    it("should handle cursors with special characters requiring URL encoding", async () => {
      const page1 = {
        status: "ok",
        has_more: true,
        data: [
          {
            id: "item1",
            cursor: "cursor+with spaces&special=chars",
          },
        ],
      };

      const page2 = {
        status: "ok",
        has_more: false,
        data: [{ id: "item2", cursor: "cursor_normal" }],
      };

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page2,
        });

      global.fetch = fetchMock;

      const result = await fetchCursorBasedPaginatedApi("/items");

      expect(result).toHaveLength(2);

      // Verify the cursor is URL encoded
      const secondCallUrl = fetchMock.mock.calls[1][0];
      expect(secondCallUrl).toContain("starting_after=");
      expect(secondCallUrl).toBe(
        "https://api.test.com/items?starting_after=cursor%2Bwith%20spaces%26special%3Dchars"
      );
    });

    it("should accumulate data correctly across multiple pages", async () => {
      const pages = [
        {
          status: "ok",
          has_more: true,
          data: [
            { value: 1, cursor: "c1" },
            { value: 2, cursor: "c2" },
          ],
        },
        {
          status: "ok",
          has_more: true,
          data: [
            { value: 3, cursor: "c3" },
            { value: 4, cursor: "c4" },
          ],
        },
        {
          status: "ok",
          has_more: true,
          data: [
            { value: 5, cursor: "c5" },
            { value: 6, cursor: "c6" },
          ],
        },
        {
          status: "ok",
          has_more: false,
          data: [
            { value: 7, cursor: "c7" },
            { value: 8, cursor: "c8" },
          ],
        },
      ];

      let callIndex = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        const page = pages[callIndex++];
        return Promise.resolve({
          ok: true,
          json: async () => page,
        });
      });

      const result = await fetchCursorBasedPaginatedApi("/data");

      // Verify all items are accumulated
      expect(result).toHaveLength(8);
      expect(result?.map((item: any) => item.value)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8,
      ]);

      // Verify correct number of API calls
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    it("should handle empty pages in pagination", async () => {
      const page1 = {
        status: "ok",
        has_more: true,
        data: [{ id: "item1", cursor: "cursor1" }],
      };

      const page2 = {
        status: "ok",
        has_more: false,
        data: [],
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page2,
        });

      const result = await fetchCursorBasedPaginatedApi("/items");

      expect(result).toHaveLength(1);
      expect(result).toEqual([{ id: "item1", cursor: "cursor1" }]);
    });

    it("should stop pagination immediately if first page returns error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await fetchCursorBasedPaginatedApi("/items");

      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should stop pagination and return null if error occurs mid-pagination", async () => {
      const page1 = {
        status: "ok",
        has_more: true,
        data: [{ id: "item1", cursor: "cursor1" }],
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => page1,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const result = await fetchCursorBasedPaginatedApi("/items");

      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
