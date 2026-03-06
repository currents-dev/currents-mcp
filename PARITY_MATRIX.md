# Parity Matrix: currents-mcp ↔ Currents REST API

**Generated:** March 4, 2026
**Branch:** cursor/currents-mcp-parity-7k4m2p9x
**OpenAPI Version:** 1.0.0
**Verification Status:** ✅ COMPLETE

## Executive Summary

Comprehensive verification of the MCP implementation against the Currents REST API OpenAPI specification.
All 28 REST API operations are fully implemented with correct parameters, request bodies, and response handling.

**Status: ✅ FULL PARITY ACHIEVED**

## Limitations

- **Currents source code access:** Unable to access the private Currents repository (`currents-dev/currents`) due to GitHub token permissions.
- **Source of truth:** Used OpenAPI specification (https://api.currents.dev/v1/docs/openapi.json) as the authoritative reference.
- **Recommendation:** A team member with repository access should verify the OpenAPI spec accurately reflects the actual API implementation at `packages/api/src/api`.

## Parity Matrix

| Endpoint | Method | OpenAPI Operation | MCP Tool Name | Status | Notes |
|----------|--------|-------------------|---------------|--------|-------|
| `/actions` | GET | `listActions` | `currents-list-actions` | ✅ OK | Required: projectId; Supports status[], search filters |
| `/actions` | POST | `createAction` | `currents-create-action` | ✅ OK | Required: projectId; Request body with name, action, matcher |
| `/actions/{actionId}` | DELETE | `deleteAction` | `currents-delete-action` | ✅ OK | Required: actionId; Soft delete (archive) |
| `/actions/{actionId}` | GET | `getAction` | `currents-get-action` | ✅ OK | Required: actionId; Returns full action details |
| `/actions/{actionId}` | PUT | `updateAction` | `currents-update-action` | ✅ OK | Required: actionId; All update fields optional |
| `/actions/{actionId}/disable` | PUT | `disableAction` | `currents-disable-action` | ✅ OK | Required: actionId; Changes status to disabled |
| `/actions/{actionId}/enable` | PUT | `enableAction` | `currents-enable-action` | ✅ OK | Required: actionId; Changes status to active |
| `/errors/{projectId}` | GET | `getErrorsExplorer` | `currents-get-errors-explorer` | ✅ OK | Required: projectId, date_start, date_end; 19 total params with comprehensive filtering |
| `/instances/{instanceId}` | GET | `getInstance` | `currents-get-spec-instance` | ✅ OK | Required: instanceId; Returns spec execution details |
| `/projects` | GET | `listProjects` | `currents-get-projects` | ✅ OK | Cursor pagination; Enhanced with fetchAll feature |
| `/projects/{projectId}` | GET | `getProject` | `currents-get-project` | ✅ OK | Required: projectId; Returns project details |
| `/projects/{projectId}/insights` | GET | `getProjectInsights` | `currents-get-project-insights` | ✅ OK | Required: projectId, date_start, date_end; Supports resolution, filters |
| `/projects/{projectId}/runs` | GET | `listProjectRuns` | `currents-get-runs` | ✅ OK | Required: projectId; Comprehensive filtering (16 params) |
| `/runs/cancel-ci/github` | PUT | `cancelRunByGithubCI` | `currents-cancel-run-github-ci` | ✅ OK | Request body with githubRunId, githubRunAttempt required |
| `/runs/find` | GET | `findRun` | `currents-find-run` | ✅ OK | Required: projectId; Search by ciBuildId or branch+tags |
| `/runs/{runId}` | DELETE | `deleteRun` | `currents-delete-run` | ✅ OK | Required: runId; Permanent deletion |
| `/runs/{runId}` | GET | `getRun` | `currents-get-run-details` | ✅ OK | Required: runId; Full run details |
| `/runs/{runId}/cancel` | PUT | `cancelRun` | `currents-cancel-run` | ✅ OK | Required: runId; Cancel in-progress run |
| `/runs/{runId}/reset` | PUT | `resetRun` | `currents-reset-run` | ✅ OK | Required: runId; Request body with machineId[] (1-63) |
| `/signature/test` | POST | `getTestSignature` | `currents-get-tests-signatures` | ✅ OK | Request body with projectId, specFilePath, testTitle required |
| `/spec-files/{projectId}` | GET | `getSpecFiles` | `currents-get-spec-files-performance` | ✅ OK | Required: projectId, date_start, date_end; 13 total params |
| `/test-results/{signature}` | GET | `getTestResults` | `currents-get-test-results` | ✅ OK | Required: signature, date_start, date_end; 16 total params |
| `/tests/{projectId}` | GET | `getTestsExplorer` | `currents-get-tests-performance` | ✅ OK | Required: projectId, date_start, date_end; 16 total params |
| `/webhooks` | GET | `listWebhooks` | `currents-list-webhooks` | ✅ OK | Required: projectId |
| `/webhooks` | POST | `createWebhook` | `currents-create-webhook` | ✅ OK | Required: projectId; Request body with url required |
| `/webhooks/{hookId}` | DELETE | `deleteWebhook` | `currents-delete-webhook` | ✅ OK | Required: hookId; Permanent deletion |
| `/webhooks/{hookId}` | GET | `getWebhook` | `currents-get-webhook` | ✅ OK | Required: hookId; Full webhook details |
| `/webhooks/{hookId}` | PUT | `updateWebhook` | `currents-update-webhook` | ✅ OK | Required: hookId; All update fields optional |

## Summary of Fixes

### No Code Changes Required

This verification confirms that the MCP implementation already achieves complete parity with the OpenAPI specification:

- ✅ All 28 REST API operations are implemented
- ✅ All parameter names, types, and requirements match exactly
- ✅ All request body schemas are correct
- ✅ Deprecated parameters are properly ignored
- ✅ Array parameter encoding follows spec (brackets where required)
- ✅ Pagination strategies match (cursor-based and page-based)
- ✅ Enum constraints are enforced
- ✅ Build and tests pass

### Enhanced Features Preserved

The following MCP-specific enhancement is retained:

**`fetchAll` parameter** in `currents-get-projects`:
- Automatically fetches all projects using cursor-based pagination
- Improves UX without breaking API compliance
- Optional feature that doesn't interfere with standard pagination

## Verification Results

### Build Status ✅
```bash
npm run build
# TypeScript compilation successful
# All types validated
# No errors or warnings
```

### Test Results ✅
```bash
npm test
# Test Files  3 passed (3)
# Tests  35 passed (35)
# Duration  415ms
# 
# ✓ src/lib/request.test.ts (13 tests)
# ✓ src/tools/projects/get-projects.test.ts (3 tests)
# ✓ src/tools/webhooks/webhooks.test.ts (19 tests)
```

## Parameter Validation Details

### Array Parameters ✅

The implementation correctly handles array parameters with two encoding styles as specified in the OpenAPI spec:

**With bracket notation:**
- `tags[]`, `branches[]`, `authors[]`, `groups[]`
- `status[]` (in test-results, tests-explorer)
- `test_state[]`, `group_by[]`

**Without bracket notation:**
- `status`, `completion_state` (in list-project-runs)

**Deprecated parameters correctly ignored:**
- Singular forms: `branch`, `tag`, `author`
- Alternative bracket forms: `branch[]`, `tag[]`, `git_author[]`, `group[]`

### Required Parameters ✅

All tools correctly enforce required parameters:
- Path parameters (projectId, runId, actionId, hookId, instanceId, signature)
- Date ranges where required (date_start, date_end)
- Request body required fields validated via Zod schemas

### Optional Parameters ✅

All optional parameters properly handled:
- Pagination cursors (starting_after, ending_before)
- Filters (search, status, completion_state, etc.)
- Sorting (order, dir, order_by)
- Limits and pagination (limit, page)

### Request Bodies ✅

All POST/PUT request body schemas validated:

1. **CreateActionRequest** (POST /actions)
   - Required: name, action, matcher
   - Optional: description, expiresAfter

2. **UpdateActionRequest** (PUT /actions/{actionId})
   - All fields optional
   - At least one field required (validated at runtime)

3. **CreateWebhookRequest** (POST /webhooks)
   - Required: url
   - Optional: headers, hookEvents, label

4. **UpdateWebhookRequest** (PUT /webhooks/{hookId})
   - All fields optional

5. **CancelRunGithubCIRequest** (PUT /runs/cancel-ci/github)
   - Required: githubRunId, githubRunAttempt
   - Optional: projectId, ciBuildId

6. **ResetRunRequest** (PUT /runs/{runId}/reset)
   - Required: machineId (array, 1-63 items)
   - Optional: isBatchedOr8n

7. **TestSignatureRequest** (POST /signature/test)
   - Required: projectId, specFilePath, testTitle
   - testTitle supports string or string[]

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
- Get Test Results, Get Tests Performance, Generate Signature

### Errors API (1 tool) ✅
- Get Errors Explorer (aggregated error metrics)

### Webhooks API (5 tools) ✅
- List, Create, Get, Update, Delete
- Support for RUN_FINISH, RUN_START, RUN_TIMEOUT, RUN_CANCELED events

## References

- **OpenAPI Spec:** https://api.currents.dev/v1/docs/openapi.json (v1.0.0)
- **Currents Source:** https://github.com/currents-dev/currents/tree/main/packages/api/src/api (private, access denied)
- **MCP Repository:** https://github.com/currents-dev/currents-mcp
- **MCP Branch:** cursor/currents-mcp-parity-7k4m2p9x
- **OpenAPI Paths:** 21 unique paths
- **OpenAPI Operations:** 28 total operations
- **MCP Tools:** 28 total tools

## Conclusion

The currents-mcp implementation demonstrates **complete parity** with the Currents REST API as documented in the OpenAPI specification (v1.0.0). All endpoints, parameters, request bodies, and response handling are correctly implemented.

No code changes are required. This verification serves to document and validate the current implementation against the official API specification.

**Verification performed:** March 4, 2026
**Verified by:** Cursor Cloud Agent
**Verification method:** Comprehensive parameter-level comparison against OpenAPI spec v1.0.0
