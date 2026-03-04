# Parity Verification: currents-mcp ↔ Currents REST API

**Date:** March 4, 2026  
**Branch:** `cursor/currents-mcp-parity-ed379fb7`  
**OpenAPI Spec Version:** 1.0.0  
**OpenAPI Source:** https://api.currents.dev/v1/docs/openapi.json

---

## Executive Summary

This PR verifies and documents **COMPLETE PARITY** between the Currents MCP Server and the Currents REST API. All 28 REST API endpoint+method combinations are fully implemented with correct parameters, request bodies, and response handling.

**Parity Status:** ✅ **100% COMPLETE** (28/28 endpoints)

---

## Sources of Truth

1. **Currents Implementation** (`https://github.com/currents-dev/currents/tree/main/packages/api/src/api`)  
   - Status: ❌ **Not Accessible** (private repository, 404 response)  
   - Attempted access via GitHub API and web search - confirmed private/unavailable

2. **OpenAPI Specification** (`https://api.currents.dev/v1/docs/openapi.json`)  
   - Status: ✅ **Accessible** (used as authoritative source)  
   - Version: 1.0.0  
   - Last verified: March 4, 2026

3. **Existing MCP Behavior**  
   - Status: ✅ **Verified** (all tests passing, build successful)  
   - Version: 2.2.7

---

## Parity Matrix

| Endpoint | Method | OpenAPI Operation | MCP Tool Name | Status | Parameters Verified |
|----------|--------|-------------------|---------------|--------|---------------------|
| `/actions` | GET | `listActions` | `currents-list-actions` | ✅ OK | projectId, status[], search |
| `/actions` | POST | `createAction` | `currents-create-action` | ✅ OK | projectId, name, description, action[], matcher, expiresAfter |
| `/actions/{actionId}` | GET | `getAction` | `currents-get-action` | ✅ OK | actionId |
| `/actions/{actionId}` | PUT | `updateAction` | `currents-update-action` | ✅ OK | actionId, name, description, action[], matcher, expiresAfter (all optional) |
| `/actions/{actionId}` | DELETE | `deleteAction` | `currents-delete-action` | ✅ OK | actionId |
| `/actions/{actionId}/enable` | PUT | `enableAction` | `currents-enable-action` | ✅ OK | actionId |
| `/actions/{actionId}/disable` | PUT | `disableAction` | `currents-disable-action` | ✅ OK | actionId |
| `/projects` | GET | `getProjects` | `currents-get-projects` | ✅ OK | limit, starting_after, ending_before, **fetchAll*** |
| `/projects/{projectId}` | GET | `getProject` | `currents-get-project` | ✅ OK | projectId |
| `/projects/{projectId}/runs` | GET | `listProjectRuns` | `currents-get-runs` | ✅ OK | projectId, limit, starting_after, ending_before, branches[], tags[], tag_operator, status[], completion_state[], authors[], search, date_start, date_end |
| `/projects/{projectId}/insights` | GET | `getProjectInsights` | `currents-get-project-insights` | ✅ OK | projectId, date_start, date_end, resolution, tags[], branches[], groups[], authors[] |
| `/runs/{runId}` | GET | `getRun` | `currents-get-run-details` | ✅ OK | runId |
| `/runs/{runId}` | DELETE | `deleteRun` | `currents-delete-run` | ✅ OK | runId |
| `/runs/find` | GET | `findRun` | `currents-find-run` | ✅ OK | projectId, ciBuildId, branch, tags[], pwLastRun |
| `/runs/{runId}/cancel` | PUT | `cancelRun` | `currents-cancel-run` | ✅ OK | runId |
| `/runs/{runId}/reset` | PUT | `resetRun` | `currents-reset-run` | ✅ OK | runId, machineId[], isBatchedOr8n |
| `/runs/cancel-ci/github` | PUT | `cancelRunGithubCI` | `currents-cancel-run-github-ci` | ✅ OK | githubRunId, githubRunAttempt, projectId, ciBuildId |
| `/instances/{instanceId}` | GET | `getInstance` | `currents-get-spec-instance` | ✅ OK | instanceId |
| `/spec-files/{projectId}` | GET | `getSpecFiles` | `currents-get-spec-files-performance` | ✅ OK | projectId, date_start, date_end, page, limit, tags[], branches[], groups[], authors[], order, dir, specNameFilter, includeFailedInDuration |
| `/test-results/{signature}` | GET | `getTestResults` | `currents-get-test-results` | ✅ OK | signature, date_start, date_end, limit, starting_after, ending_before, branches[], tags[], authors[], status[], groups[], flaky |
| `/tests/{projectId}` | GET | `getTests` | `currents-get-tests-performance` | ✅ OK | projectId, date_start, date_end, page, limit, tags[], branches[], groups[], authors[], order, dir, spec, title, min_executions, test_state[], metric_settings |
| `/errors/{projectId}` | GET | `getErrorsExplorer` | `currents-get-errors-explorer` | ✅ OK | projectId, date_start, date_end, page, limit, tags[], tags_logical_operator, branches[], groups[], authors[], error_target, error_message, error_category, error_action, order_by, dir, group_by[], metric, top_n |
| `/signature/test` | POST | `generateSignature` | `currents-get-tests-signatures` | ✅ OK | projectId, specFilePath, testTitle |
| `/webhooks` | GET | `listWebhooks` | `currents-list-webhooks` | ✅ OK | projectId |
| `/webhooks` | POST | `createWebhook` | `currents-create-webhook` | ✅ OK | projectId, url, headers, hookEvents[], label |
| `/webhooks/{hookId}` | GET | `getWebhook` | `currents-get-webhook` | ✅ OK | hookId |
| `/webhooks/{hookId}` | PUT | `updateWebhook` | `currents-update-webhook` | ✅ OK | hookId, url, headers, hookEvents[], label (all optional) |
| `/webhooks/{hookId}` | DELETE | `deleteWebhook` | `currents-delete-webhook` | ✅ OK | hookId |

**\*fetchAll** is an MCP-specific enhancement for automatic pagination (not in OpenAPI spec, added for better UX)

---

## Summary of Verification

### ✅ Endpoint Coverage: 28/28 (100%)

**Actions API** (7 endpoints)
- ✅ List, Create, Get, Update, Delete, Enable, Disable

**Projects API** (4 endpoints)
- ✅ List, Get, Get Insights, Get Runs

**Runs API** (6 endpoints)
- ✅ Get, Delete, Find, Cancel, Reset, Cancel by GitHub CI

**Instances API** (1 endpoint)
- ✅ Get Instance

**Spec Files API** (1 endpoint)
- ✅ Get Spec Files Performance

**Test Results API** (1 endpoint)
- ✅ Get Test Results

**Tests Explorer API** (1 endpoint)
- ✅ Get Tests Performance

**Errors Explorer API** (1 endpoint)
- ✅ Get Errors Explorer

**Signature API** (1 endpoint)
- ✅ Generate Test Signature

**Webhooks API** (5 endpoints)
- ✅ List, Create, Get, Update, Delete

### ✅ Parameter Validation

- **Array Parameters:** All correctly use bracket notation (`tags[]`, `branches[]`, `authors[]`, `groups[]`)
- **Deprecated Parameters:** Correctly omitted (e.g., `branch`, `tag`, `author`, `git_author`)
- **Required vs Optional:** All match OpenAPI specification exactly
- **Type Safety:** Zod schemas provide runtime validation matching OpenAPI types
- **Default Values:** All align with OpenAPI defaults
- **Enum Values:** All match specification exactly

### ✅ Request Body Schemas

- **Actions:** Complex nested schemas with RuleAction and RuleMatcher ✅
- **Webhooks:** Optional fields handled correctly ✅
- **Runs:** Reset and cancel operations with proper request structures ✅
- **Signature:** Support for string or array test titles ✅

### ✅ Pagination

- **Cursor-based:** Implemented for projects, runs, test results (limit, starting_after, ending_before) ✅
- **Page-based:** Implemented for explorers (page, limit) ✅

---

## Verification Results

### Build Status
```bash
npm run build
```
**Result:** ✅ **SUCCESS** - TypeScript compilation successful, no errors

### Test Results
```bash
npm test
```
**Result:** ✅ **SUCCESS**
- 3 test files passed
- 35 tests passed
- Test coverage: Request utilities, Projects, Webhooks

### Code Quality
- ✅ TypeScript types properly defined
- ✅ Zod schemas match OpenAPI specifications
- ✅ Error handling consistent across all tools
- ✅ Structured logging for all API operations

---

## Enhancement: fetchAll Parameter

The `currents-get-projects` tool includes a `fetchAll` parameter not present in the OpenAPI spec. This is a **positive enhancement** that:
- Enables automatic pagination for better UX
- Does not break API compatibility
- Does not conflict with any OpenAPI parameters
- Provides value for MCP users who need to fetch all projects

**Recommendation:** Keep this enhancement as it improves usability without compromising parity.

---

## References

### OpenAPI Specification
- **URL:** https://api.currents.dev/v1/docs/openapi.json
- **Version:** 1.0.0
- **Verified:** March 4, 2026
- **Total Endpoints:** 28 (all implemented)

### Currents Implementation
- **URL:** https://github.com/currents-dev/currents/tree/main/packages/api/src/api
- **Status:** Private repository (inaccessible)
- **Note:** Verification performed against OpenAPI spec as authoritative source

### MCP Implementation
- **Repository:** currents-dev/currents-mcp
- **Branch:** cursor/currents-mcp-parity-ed379fb7
- **Version:** 2.2.7
- **Tools Location:** /workspace/mcp-server/src/tools/

---

## Conclusion

The Currents MCP Server demonstrates **complete and accurate implementation** of the Currents REST API as documented in the OpenAPI specification. All 28 endpoint+method combinations are implemented with correct parameters, request bodies, response handling, and error management.

**Status: ✅ COMPLETE PARITY ACHIEVED**

No implementation changes required. This PR documents the verification of complete API parity.
