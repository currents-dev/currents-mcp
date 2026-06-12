import { describe, expect, it, vi } from "vitest";
import * as request from "../../lib/request.js";
import { linkJiraIssueFromRunTestTool } from "./link-jira-issue.js";

describe("linkJiraIssueFromRunTestTool", () => {
  it("calls POST /projects/{projectId}/jira/issues/{jiraIssueKey}/link with required body fields", async () => {
    vi.spyOn(request, "postApi").mockResolvedValue({ status: "OK", data: {} });

    await linkJiraIssueFromRunTestTool.handler({
      projectId: "p1",
      jiraIssueKey: "PROJ-42",
      runId: "run-1",
      testId: "test-1",
      jiraInstallationId: "inst-1",
      jiraProjectId: "10000",
      jiraIssueType: "10001",
    });

    expect(request.postApi).toHaveBeenCalledWith(
      "/projects/p1/jira/issues/PROJ-42/link",
      {
        runId: "run-1",
        testId: "test-1",
        jiraInstallationId: "inst-1",
        jiraProjectId: "10000",
        jiraIssueType: "10001",
      }
    );
  });

  it("includes optional comment and includeContextInComment in request body", async () => {
    vi.spyOn(request, "postApi").mockResolvedValue({ status: "OK", data: {} });

    await linkJiraIssueFromRunTestTool.handler({
      projectId: "p1",
      jiraIssueKey: "PROJ-42",
      runId: "run-1",
      testId: "test-1",
      jiraInstallationId: "inst-1",
      jiraProjectId: "10000",
      jiraIssueType: "10001",
      comment: "Manual note",
      includeContextInComment: false,
    });

    expect(request.postApi).toHaveBeenCalledWith(
      "/projects/p1/jira/issues/PROJ-42/link",
      expect.objectContaining({
        comment: "Manual note",
        includeContextInComment: false,
      })
    );
  });

  it("schema requires comment when includeContextInComment is false", () => {
    const result = linkJiraIssueFromRunTestTool.schema.safeParse({
      projectId: "p1",
      jiraIssueKey: "PROJ-42",
      runId: "run-1",
      testId: "test-1",
      jiraInstallationId: "inst-1",
      jiraProjectId: "10000",
      jiraIssueType: "10001",
      includeContextInComment: false,
    });

    expect(result.success).toBe(false);
  });
});
