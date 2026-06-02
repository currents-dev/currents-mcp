import { describe, expect, it, vi } from "vitest";
import * as request from "../../lib/request.js";
import { listJiraProjectsTool } from "./list-jira-projects.js";

describe("listJiraProjectsTool", () => {
  it("calls GET /integrations/jira/projects with required installation id", async () => {
    vi.spyOn(request, "fetchApi").mockResolvedValue({ status: "OK", data: [] });

    await listJiraProjectsTool.handler({
      jira_installation_id: "inst-1",
      search: "core",
      page: 1,
      limit: 25,
    });

    const url = vi.mocked(request.fetchApi).mock.calls[0][0] as string;
    expect(url).toBe(
      "/integrations/jira/projects?jira_installation_id=inst-1&search=core&page=1&limit=25"
    );
  });
});
