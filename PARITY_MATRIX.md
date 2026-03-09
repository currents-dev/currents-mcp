# Parity Matrix: currents-mcp ↔ Currents API

**Generated:** March 9, 2026  
**Branch:** cursor/currents-mcp-parity-x7m9q4w2  
**OpenAPI Version:** 1.0.0  
**Verification Status:** ✅ COMPLETE

## Executive Summary

Comprehensive verification and update of the MCP implementation against the Currents REST API OpenAPI specification. One missing parameter was identified and fixed.

**Status: ✅ FULL PARITY ACHIEVED**

## Parity Matrix

| Endpoint | Method | Source of Truth | MCP Tool Name | Status | Notes |
|----------|--------|-----------------|---------------|--------|-------|
| `/actions` | GET | OpenAPI: `listActions` | `currents-list-actions` | ✅ OK | Required: projectId; Supports status[], search filters |
| `/actions` | POST | OpenAPI: `createAction` | `currents-create-action` | ✅ OK | Required: projectId; Request body with name, action, matcher |
| `/actions/{actionId}` | DELETE | OpenAPI: `deleteAction` | `currents-delete-action` | ✅ OK | Required: actionId; Soft delete (archive) |
| `/actions/{actionId}` | GET | OpenAPI: `getAction` | `currents-get-action` | ✅ OK | Required: actionId; Returns full action details |
| `/actions/{actionId}` | PUT | OpenAPI: `updateAction` | `currents-update-action` | ✅ OK | Required: actionId; All update fields optional |
| `/actions/{actionId}/disable` | PUT | OpenAPI: `disableAction` | `currents-disable-action` | ✅ OK | Required: actionId; Changes status to disabled |
| `/actions/{actionId}/enable` | PUT | OpenAPI: `enableAction` | `currents-enable-action` | ✅ OK | Required: actionId; Changes status to active |
| `/errors/{projectId}` | GET | OpenAPI: `getErrorsExplorer` | `currents-get-errors-explorer` | ✅ OK | Required: projectId, date_start, date_end; 19 total params with comprehensive filtering |
| `/instances/{instanceId}` | GET | OpenAPI: `getInstance` | `currents-get-spec-instance` | ✅ OK | Required: instanceId; Returns spec execution details |
| `/projects` | GET | OpenAPI: `listProjects` | `currents-get-projects` | ✅ OK | Cursor pagination; Enhanced with fetchAll feature |
| `/projects/{projectId}` | GET | OpenAPI: `getProject` | `currents-get-project` | ✅ OK | Required: projectId; Returns project details |
| `/projects/{projectId}/insights` | GET | OpenAPI: `getProjectInsights` | `currents-get-project-insights` | ✅ OK | Required: projectId, date_start, date_end; Supports resolution, filters |
| `/projects/{projectId}/runs` | GET | OpenAPI: `listProjectRuns` | `currents-get-runs` | ✅ OK | Required: projectId; Comprehensive filtering (16 params) |
| `/runs/cancel-ci/github` | PUT | OpenAPI: `cancelRunByGithubCI` | `currents-cancel-run-github-ci` | ✅ OK | Request body with githubRunId, githubRunAttempt required |
| `/runs/find` | GET | OpenAPI: `findRun` | `currents-find-run` | ✅ OK | Required: projectId; Search by ciBuildId or branch+tags |
| `/runs/{runId}` | DELETE | OpenAPI: `deleteRun` | `currents-delete-run` | ✅ OK | Required: runId; Permanent deletion |
| `/runs/{runId}` | GET | OpenAPI: `getRun` | `currents-get-run-details` | ✅ OK | Required: runId; Full run details |
| `/runs/{runId}/cancel` | PUT | OpenAPI: `cancelRun` | `currents-cancel-run` | ✅ OK | Required: runId; Cancel in-progress run |
| `/runs/{runId}/reset` | PUT | OpenAPI: `resetRun` | `currents-reset-run` | ✅ OK | Required: runId; Request body with machineId[] (1-63) |
| `/signature/test` | POST | OpenAPI: `getTestSignature` | `currents-get-tests-signatures` | ✅ OK | Request body with projectId, specFilePath, testTitle required |
| `/spec-files/{projectId}` | GET | OpenAPI: `getSpecFiles` | `currents-get-spec-files-performance` | ✅ OK | Required: projectId, date_start, date_end; 13 total params |
| `/test-results/{signature}` | GET | OpenAPI: `getTestResults` | `currents-get-test-results` | ✅ FIXED | **FIXED:** Added missing `annotations` parameter; signature, date_start, date_end required; 16 total params |
| `/tests/{projectId}` | GET | OpenAPI: `getTestsExplorer` | `currents-get-tests-performance` | ✅ OK | Required: projectId, date_start, date_end; 16 total params |
| `/webhooks` | GET | OpenAPI: `listWebhooks` | `currents-list-webhooks` | ✅ OK | Required: projectId |
| `/webhooks` | POST | OpenAPI: `createWebhook` | `currents-create-webhook` | ✅ OK | Required: projectId; Request body with url required |
| `/webhooks/{hookId}` | DELETE | OpenAPI: `deleteWebhook` | `currents-delete-webhook` | ✅ OK | Required: hookId; Permanent deletion |
| `/webhooks/{hookId}` | GET | OpenAPI: `getWebhook` | `currents-get-webhook` | ✅ OK | Required: hookId; Full webhook details |
| `/webhooks/{hookId}` | PUT | OpenAPI: `updateWebhook` | `currents-update-webhook` | ✅ OK | Required: hookId; All update fields optional |

**Total Endpoints:** 28  
**OK:** 27  
**Fixed:** 1  
**Missing:** 0  
**Extra:** 0

## Summary of Fixes

### 1. Added Missing `annotations` Parameter

**Tool:** `currents-get-test-results`  
**Endpoint:** `GET /test-results/{signature}`  
**Change:** Added `annotations` query parameter

The `annotations` parameter was missing from the test results tool. This parameter allows filtering test results by test annotations (e.g., owner, skip, etc.).

**Parameter Details:**
- **Type:** string (JSON-stringified array)
- **Required:** false
- **Format:** `[{ "type": "string", "description": "string" | ["string"] or null }]`
- **Example:** `[{"type":"owner","description":["John Doe"]},{"type":"skip"}]`
- **Description:** Filter by test annotations. The description field is optional; omit or set to null to match any value for that annotation type.

**Code Changes:**
```typescript
// Added to schema:
annotations: z
  .string()
  .optional()
  .describe("Filter by test annotations...")

// Added to handler:
if (annotations) {
  queryParams.append("annotations", annotations);
}
```

### Preserved Correct Behavior

All other 27 endpoints were already correctly implemented with:
- ✅ Correct parameter names, types, and constraints
- ✅ Proper array parameter encoding (brackets where required)
- ✅ Request body schemas matching OpenAPI spec
- ✅ Deprecated parameters properly ignored
- ✅ Pagination strategies (cursor-based and page-based)
- ✅ Enum constraints enforced
- ✅ Required/optional parameter handling

### Enhanced Features Retained

**`fetchAll` parameter** in `currents-get-projects`:
- Automatically fetches all projects using cursor-based pagination
- MCP-specific enhancement that improves UX
- Does not violate API compliance (optional feature)

## Verification

### Build Status ✅

```bash
npm run build
# TypeScript compilation successful
# Exit code: 0
```

### Test Results ✅

```bash
npm test
# Test Files  3 passed (3)
# Tests  35 passed (35)
# Duration  385ms
# 
# ✓ src/lib/request.test.ts (13 tests)
# ✓ src/tools/projects/get-projects.test.ts (3 tests)
# ✓ src/tools/webhooks/webhooks.test.ts (19 tests)
```

## Parameter Validation Details

### Complete Coverage ✅

All 28 REST API operations are fully implemented with correct parameters.

### Array Parameters ✅

The implementation correctly handles array parameters with bracket notation as specified:
- `tags[]`, `branches[]`, `authors[]`, `groups[]`
- `status[]` (in test-results, tests-explorer)
- `test_state[]`, `group_by[]`
- `status`, `completion_state` (without brackets in list-project-runs, per spec)

### Deprecated Parameters Correctly Ignored ✅

The implementation properly ignores deprecated singular and alternative bracket forms:
- Singular: `branch`, `tag`, `author`
- Alternative: `branch[]`, `tag[]`, `git_author[]`, `group[]`

Using modern array parameters instead:
- `branches[]`, `tags[]`, `authors[]`, `groups[]`

### New Parameter: `annotations` ✅

**Added to:** `currents-get-test-results`  
**Type:** string (JSON-stringified array of annotation filters)  
**Purpose:** Filter test results by test annotations (e.g., owner, skip, tags)  
**Example:** `[{"type":"owner","description":["John Doe"]},{"type":"skip"}]`

This parameter enables filtering of test results by Playwright/Cypress test annotations, which is critical for finding tests with specific metadata (owners, skip reasons, custom annotations).

## Tool Coverage by Category

### Actions API (7 tools) ✅
- List, Create, Get, Update, Delete, Enable, Disable
- Complex matcher conditions with AND/OR logic
- Support for skip, quarantine, and tag operations

### Projects API (3 tools + 1 runs tool) ✅
- List (with fetchAll enhancement), Get, Get Insights
- Get Runs (comprehensive filtering)

### Runs API (6 tools) ✅
- Get, Delete, Find, Cancel, Reset
- Cancel by GitHub CI workflow

### Instances API (1 tool) ✅
- Get Instance (spec file execution details)

### Spec Files API (1 tool) ✅
- Get Spec Files Performance (aggregated metrics)

### Tests API (3 tools) ✅
- Get Test Results (**now with annotations**), Get Tests Performance, Generate Signature

### Errors API (1 tool) ✅
- Get Errors Explorer (aggregated error metrics)

### Webhooks API (5 tools) ✅
- List, Create, Get, Update, Delete
- Support for RUN_FINISH, RUN_START, RUN_TIMEOUT, RUN_CANCELED events

## References

- **OpenAPI Spec:** https://api.currents.dev/v1/docs/openapi.json (v1.0.0)
- **Currents Source:** https://github.com/currents-dev/currents/tree/main/packages/api/src/api (private, not accessible)
- **MCP Repository:** https://github.com/currents-dev/currents-mcp
- **Branch:** cursor/currents-mcp-parity-x7m9q4w2
- **OpenAPI Paths:** 21 unique paths
- **OpenAPI Operations:** 28 total operations
- **MCP Tools:** 28 total tools

## Source of Truth Precedence

Per requirements, the Currents implementation source code has highest precedence. However:
- **Currents repository access:** Private repository, not accessible with current credentials
- **Fallback source:** OpenAPI specification (v1.0.0) used as authoritative reference
- **Risk mitigation:** Comprehensive parameter-level validation against published API spec
- **Recommendation:** Team member with repository access should verify OpenAPI spec accuracy against actual implementation

## Conclusion

The currents-mcp implementation now has **complete parity** with the Currents REST API as documented in the OpenAPI specification (v1.0.0). The missing `annotations` parameter has been added to the test results tool, completing the implementation.

**Verification performed:** March 9, 2026  
**Verified by:** Cursor Cloud Agent  
**Changes made:** 1 parameter addition  
**Tests passing:** 35/35 ✅  
**Build status:** ✅ Success
