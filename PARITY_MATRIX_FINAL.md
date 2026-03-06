# Parity Matrix: currents-mcp ↔ Currents REST API

## Summary
This document provides complete verification of parity between the Currents REST API (as defined by the OpenAPI specification at `https://api.currents.dev/v1/docs/openapi.json`) and the currents-mcp MCP server implementation.

**Verification Date:** March 6, 2026  
**Branch:** cursor/currents-mcp-parity-kx7m2p9n  
**OpenAPI Version:** 1.0.0  
**Total Endpoints:** 28  
**Parity Status:** ✅ **COMPLETE (100%)**

---

## Parity Matrix

| Endpoint | Method | OpenAPI Ref | MCP Tool Name | Status | Notes |
|----------|--------|-------------|---------------|--------|-------|
| `/actions` | GET | `listActions` | `currents-list-actions` | ✅ OK | Supports projectId (required), status[] filter, search by name |
| `/actions` | POST | `createAction` | `currents-create-action` | ✅ OK | Requires projectId, name, action[], matcher; optional description, expiresAfter |
| `/actions/{actionId}` | GET | `getAction` | `currents-get-action` | ✅ OK | actionId is globally unique; returns full action details |
| `/actions/{actionId}` | PUT | `updateAction` | `currents-update-action` | ✅ OK | All fields optional; at least one required for update |
| `/actions/{actionId}` | DELETE | `deleteAction` | `currents-delete-action` | ✅ OK | Soft delete (archives action) |
| `/actions/{actionId}/enable` | PUT | `enableAction` | `currents-enable-action` | ✅ OK | Changes status from disabled to active |
| `/actions/{actionId}/disable` | PUT | `disableAction` | `currents-disable-action` | ✅ OK | Changes status to disabled |
| `/projects` | GET | `listProjects` | `currents-get-projects` | ✅ OK | Cursor pagination (limit, starting_after, ending_before); enhanced with fetchAll option |
| `/projects/{projectId}` | GET | `getProject` | `currents-get-project` | ✅ OK | Returns project details including name, failFast, inactivity timeout, default branch |
| `/projects/{projectId}/insights` | GET | `getProjectInsights` | `currents-get-project-insights` | ✅ OK | Requires date_start, date_end; supports resolution (1h/1d/1w), tags[], branches[], groups[], authors[] |
| `/projects/{projectId}/runs` | GET | `listProjectRuns` | `currents-get-runs` | ✅ OK | Full filtering: branches[], tags[], tag_operator, status[], completion_state[], authors[], search, date_start, date_end; cursor pagination |
| `/runs/{runId}` | GET | `getRun` | `currents-get-run-details` | ✅ OK | Returns complete run details |
| `/runs/{runId}` | DELETE | `deleteRun` | `currents-delete-run` | ✅ OK | Permanent deletion |
| `/runs/find` | GET | `findRun` | `currents-find-run` | ✅ OK | Search by ciBuildId (exact) or branch+tags; supports pwLastRun flag for Playwright |
| `/runs/{runId}/cancel` | PUT | `cancelRun` | `currents-cancel-run` | ✅ OK | Cancels in-progress run |
| `/runs/{runId}/reset` | PUT | `resetRun` | `currents-reset-run` | ✅ OK | Reset failed specs; requires machineId[] (1-63), supports isBatchedOr8n |
| `/runs/cancel-ci/github` | PUT | `cancelRunByGithubCI` | `currents-cancel-run-github-ci` | ✅ OK | GitHub-specific cancellation; requires githubRunId, githubRunAttempt; optional projectId, ciBuildId |
| `/instances/{instanceId}` | GET | `getInstance` | `currents-get-spec-instance` | ✅ OK | Returns spec file execution details with full test results |
| `/spec-files/{projectId}` | GET | `getSpecFiles` | `currents-get-spec-files-performance` | ✅ OK | Page-based pagination; supports 10 ordering options (avgDuration, failureRate, flakeRate, etc.); filters: specNameFilter, tags[], branches[], groups[], authors[], includeFailedInDuration |
| `/test-results/{signature}` | GET | `getTestResults` | `currents-get-test-results` | ✅ OK | Cursor pagination; requires signature; supports date_start, date_end, branches[], tags[], authors[], status[], groups[], flaky filter |
| `/tests/{projectId}` | GET | `getTestsExplorer` | `currents-get-tests-performance` | ✅ OK | Page-based pagination; supports 12 ordering options including delta metrics; filters: spec, title, tags[], branches[], groups[], authors[], min_executions, test_state[], metric_settings (JSON) |
| `/signature/test` | POST | `getTestSignature` | `currents-get-tests-signatures` | ✅ OK | Generates test signature; requires projectId, specFilePath, testTitle (string or array for nested describes) |
| `/errors/{projectId}` | GET | `getErrorsExplorer` | `currents-get-errors-explorer` | ✅ OK | Aggregated error metrics; page-based pagination; extensive filters: error_target, error_message, error_category, error_action, tags[], tags_logical_operator, branches[], groups[], authors[]; supports group_by[], order_by, metric, top_n |
| `/webhooks` | GET | `listWebhooks` | `currents-list-webhooks` | ✅ OK | Lists all webhooks for project; requires projectId |
| `/webhooks` | POST | `createWebhook` | `currents-create-webhook` | ✅ OK | Requires projectId, url; optional headers (JSON string), hookEvents[], label |
| `/webhooks/{hookId}` | GET | `getWebhook` | `currents-get-webhook` | ✅ OK | Returns full webhook details; hookId is UUID |
| `/webhooks/{hookId}` | PUT | `updateWebhook` | `currents-update-webhook` | ✅ OK | All fields optional; hookId is UUID |
| `/webhooks/{hookId}` | DELETE | `deleteWebhook` | `currents-delete-webhook` | ✅ OK | Permanent deletion; hookId is UUID |

---

## Summary of Coverage

### Actions API (7 endpoints)
✅ **100% Coverage** - Full CRUD operations for test actions/rules
- List with filtering (status, search)
- Create with complex matcher conditions (12 condition types, 10 operators)
- Get, Update, Delete (soft delete/archive)
- Enable/Disable state management
- Support for skip, quarantine, and tag operations

### Projects API (4 endpoints)
✅ **100% Coverage** - Project management and insights
- List projects with cursor pagination + enhanced fetchAll option
- Get project details
- Get project runs with comprehensive filtering (11 filter parameters)
- Get project insights with timeline data (resolution: 1h/1d/1w)

### Runs API (6 endpoints)
✅ **100% Coverage** - Run lifecycle management
- Get run details
- Find run (by ciBuildId, branch, tags)
- Cancel run (standard + GitHub CI-specific)
- Reset run (up to 63 machines, batched orchestration support)
- Delete run (permanent)

### Instances API (1 endpoint)
✅ **100% Coverage** - Spec file execution debugging
- Get instance details with full test results

### Spec Files API (1 endpoint)
✅ **100% Coverage** - Spec file performance metrics
- Page-based pagination
- 10 ordering options (duration, failure rate, flake rate, etc.)
- Comprehensive filtering (tags, branches, groups, authors, name filter)
- Optional failed execution inclusion in duration calculation

### Tests API (3 endpoints)
✅ **100% Coverage** - Test performance and history
- Get test results (historical execution data with cursor pagination)
- Get test performance (aggregated metrics with 12 ordering options)
- Generate test signature (supports nested describe blocks)

### Errors API (1 endpoint)
✅ **100% Coverage** - Error analytics
- Aggregated error metrics with timeline data
- Error-specific filters (target, message, category, action)
- Multi-dimensional grouping (order matters)
- Configurable timeline ranking (occurrence/test/branch metrics)
- Top N errors per bucket (1-50)

### Webhooks API (5 endpoints)
✅ **100% Coverage** - Webhook CRUD operations
- List, Create, Get, Update, Delete
- Support for 4 event types (RUN_FINISH, RUN_START, RUN_TIMEOUT, RUN_CANCELED)
- Custom headers as JSON string
- UUID-based IDs

---

## Parameter Verification

### Array Parameters ✅
All array parameters correctly use bracket notation in query strings:
- `tags[]`, `branches[]`, `groups[]`, `authors[]`, `group_by[]`, `test_state[]`, `hookEvents[]`
- Exception: `status` and `completion_state` arrays don't use brackets (matches OpenAPI spec)

### Pagination ✅
- **Cursor-based:** Projects, Runs, Test Results (limit, starting_after, ending_before)
- **Page-based:** Spec Files, Tests, Errors (page, limit)
- **Enhanced:** Projects tool includes fetchAll option for automatic pagination (non-breaking enhancement)

### Required vs Optional ✅
All parameters match OpenAPI specification:
- Required parameters enforced via Zod schemas
- Optional parameters with correct defaults
- Path parameters (projectId, actionId, runId, hookId, instanceId, signature) properly validated

### Enums ✅
All enum values match specification:
- ActionStatus: active, disabled, archived, expired
- HookEvent: RUN_FINISH, RUN_START, RUN_TIMEOUT, RUN_CANCELED
- Run status: PASSED, FAILED, RUNNING, FAILING
- Completion state: COMPLETE, IN_PROGRESS, CANCELED, TIMEOUT
- Test state: passed, failed, pending, skipped
- Sort direction: asc, desc
- Logical operators: AND, OR

### Complex Schemas ✅
- Actions: Nested RuleAction and RuleMatcher with union types correctly implemented
- Test signatures: Accepts both string and array for testTitle
- Webhook headers: JSON string format (matches OpenAPI spec)
- Metric settings: JSON string for custom configuration

---

## Verification

### Build Status
```bash
npm run build
# ✅ TypeScript compilation successful
# ✅ Output: build/index.js (executable)
```

### Test Results
```bash
npm test
# ✅ 3 test files passed
# ✅ 35 tests total
# ✅ Test suites:
#    - lib/request.test.ts (13 tests)
#    - tools/projects/get-projects.test.ts (3 tests)
#    - tools/webhooks/webhooks.test.ts (19 tests)
```

### Code Quality
- ✅ All TypeScript types properly defined
- ✅ Zod schemas match OpenAPI parameter specifications exactly
- ✅ Consistent error handling across all tools
- ✅ Structured logging for all API operations
- ✅ Request utilities reused (fetchApi, postApi, putApi, deleteApi)
- ✅ Clean separation: tools, lib, schemas

---

## References

### OpenAPI Specification
- **Source:** https://api.currents.dev/v1/docs/openapi.json
- **Version:** 1.0.0
- **Base URL:** https://api.currents.dev/v1
- **Total Operations:** 28
- **All operations verified:** ✅

### Currents Implementation
- **Repository:** https://github.com/currents-dev/currents (private)
- **Path:** /packages/api/src/api
- **Status:** Not accessible (private repository)
- **Verification approach:** OpenAPI spec used as authoritative source

### MCP Implementation
- **Repository:** https://github.com/currents-dev/currents-mcp
- **Branch:** cursor/currents-mcp-parity-kx7m2p9n
- **Tools path:** /workspace/mcp-server/src/tools/
- **Total tools:** 28
- **Tool structure:** Consistent across all implementations

---

## Conclusion

The currents-mcp MCP server demonstrates **COMPLETE PARITY** with the Currents REST API as documented in the OpenAPI specification version 1.0.0.

**Coverage Statistics:**
- **Total REST API operations:** 28
- **MCP tools implemented:** 28
- **Parity percentage:** 100%
- **Missing endpoints:** 0
- **Parameter mismatches:** 0

**Key Findings:**
1. All 28 OpenAPI operations are correctly mapped to MCP tools
2. All parameters (required and optional) match the specification
3. Array parameter formatting matches spec (with bracket notation)
4. Pagination strategies correctly implemented (cursor and page-based)
5. Enum values match specification exactly
6. Complex nested schemas correctly implemented
7. All tests pass (35/35)
8. Build successful with no TypeScript errors

**Non-Breaking Enhancements:**
- Projects tool includes `fetchAll` parameter for automatic pagination (convenience feature that doesn't violate spec)

**No changes required.** The implementation is production-ready and maintains complete parity with the Currents REST API.

---

*Analysis performed by Cloud Agent (Cursor AI)*  
*Date: March 6, 2026*  
*OpenAPI Spec: https://api.currents.dev/v1/docs/openapi.json*  
*Repository: https://github.com/currents-dev/currents-mcp*
