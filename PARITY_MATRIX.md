# Parity Matrix: currents-mcp ↔ Currents REST API

## Summary
This document tracks the complete parity between the Currents REST API (OpenAPI spec) and the currents-mcp MCP server implementation.

## Status Legend
- **OK**: Endpoint is implemented with correct parameters and behavior
- **MISSING**: Endpoint exists in OpenAPI but not in MCP
- **FIXED**: Previously missing endpoint, now implemented in this PR
- **EXTRA**: Tool exists in MCP but has no direct OpenAPI endpoint (may be a helper/composite tool)

---

## Parity Matrix

| Endpoint | Method | OpenAPI Ref | MCP Tool Name | Status | Notes |
|----------|--------|-------------|---------------|--------|-------|
| `/actions` | GET | `listActions` | `currents-list-actions` | OK | Supports projectId, status[], search filters |
| `/actions` | POST | `createAction` | `currents-create-action` | OK | Requires projectId, name, action[], matcher |
| `/actions/{actionId}` | GET | `getAction` | `currents-get-action` | OK | actionId is globally unique |
| `/actions/{actionId}` | PUT | `updateAction` | `currents-update-action` | OK | All fields optional, at least one required |
| `/actions/{actionId}` | DELETE | `deleteAction` | `currents-delete-action` | OK | Soft delete (archive) |
| `/actions/{actionId}/enable` | PUT | `enableAction` | `currents-enable-action` | OK | Changes status to active |
| `/actions/{actionId}/disable` | PUT | `disableAction` | `currents-disable-action` | OK | Changes status to disabled |
| `/projects` | GET | `listProjects` | `currents-get-projects` | OK | Supports cursor pagination + fetchAll helper |
| `/projects/{projectId}` | GET | `getProject` | `currents-get-project` | OK | Returns project details |
| `/projects/{projectId}/runs` | GET | `listProjectRuns` | `currents-get-runs` | OK | Full filtering: branches[], tags[], tag_operator, status[], completion_state[], authors[], search, date_start, date_end, pagination |
| `/projects/{projectId}/insights` | GET | `getProjectInsights` | `currents-get-project-insights` | OK | Requires date_start, date_end; supports resolution, tags[], branches[], groups[], authors[] |
| `/runs/{runId}` | GET | `getRun` | `currents-get-run-details` | OK | Returns full run details |
| `/runs/{runId}` | DELETE | `deleteRun` | `currents-delete-run` | OK | Permanent deletion |
| `/runs/find` | GET | `findRun` | `currents-find-run` | OK | Search by ciBuildId or branch+tags; supports pwLastRun flag |
| `/runs/{runId}/cancel` | PUT | `cancelRun` | `currents-cancel-run` | OK | Cancel in-progress run |
| `/runs/{runId}/reset` | PUT | `resetRun` | `currents-reset-run` | OK | Reset failed specs; requires machineId[], supports isBatchedOr8n |
| `/runs/cancel-ci/github` | PUT | `cancelRunGithubCI` | `currents-cancel-run-github-ci` | OK | Cancel by GitHub workflow; requires githubRunId, githubRunAttempt; optional projectId, ciBuildId |
| `/instances/{instanceId}` | GET | `getInstance` | `currents-get-spec-instance` | OK | Returns spec file execution details |
| `/spec-files/{projectId}` | GET | `getSpecFiles` | `currents-get-spec-files-performance` | OK | Page-based pagination; supports specNameFilter, order, dir, tags[], branches[], groups[], authors[], includeFailedInDuration |
| `/test-results/{signature}` | GET | `getTestResults` | `currents-get-test-results` | OK | Cursor pagination; supports date_start, date_end, branches[], tags[], authors[], status[], groups[], flaky filter |
| `/tests/{projectId}` | GET | `getTests` | `currents-get-tests-performance` | OK | Page-based pagination; supports spec, title filters, order, dir, tags[], branches[], groups[], authors[], min_executions, test_state[], metric_settings |
| `/errors/{projectId}` | GET | `getErrorsExplorer` | `currents-get-errors-explorer` | **FIXED** | **Added in this PR.** Aggregated error metrics with filtering by error_target, error_message, error_category, error_action, tags[], branches[], authors[], groups[]; supports group_by[], order_by, dir, metric, top_n; page-based pagination |
| `/signature/test` | POST | `generateSignature` | `currents-get-tests-signatures` | OK | Generates test signature from projectId, specFilePath, testTitle |
| `/webhooks` | GET | `listWebhooks` | `currents-list-webhooks` | OK | Lists all webhooks for a project |
| `/webhooks` | POST | `createWebhook` | `currents-create-webhook` | OK | Requires projectId, url; optional headers, hookEvents[], label |
| `/webhooks/{hookId}` | GET | `getWebhook` | `currents-get-webhook` | OK | Returns full webhook details |
| `/webhooks/{hookId}` | PUT | `updateWebhook` | `currents-update-webhook` | OK | All fields optional |
| `/webhooks/{hookId}` | DELETE | `deleteWebhook` | `currents-delete-webhook` | OK | Permanent deletion |

---

## Summary of Fixes

### Added Endpoints
1. **Errors Explorer** (`GET /errors/{projectId}`)
   - Tool: `currents-get-errors-explorer`
   - Provides aggregated error metrics with comprehensive filtering
   - Supports error-specific filters: error_target, error_message, error_category, error_action
   - Supports grouping by target, action, category, or message
   - Includes timeline data with configurable metric (occurrence/test/branch) and top_n
   - Page-based pagination (page, limit)
   - Standard filters: tags[], branches[], groups[], authors[]
   - Special tags_logical_operator parameter (OR/AND)

### Parameter Verification
All existing tools have been verified to match the OpenAPI specification:
- Array parameters use bracket notation (tags[], branches[], authors[], groups[])
- Deprecated parameters (branch, tag, git_author, author) are NOT implemented (correctly using only current parameter names)
- Pagination: Cursor-based for most endpoints (limit, starting_after, ending_before), page-based for explorers (page, limit)
- Required vs optional parameters match spec exactly
- Default values align with OpenAPI defaults
- Enum values match specification

### No Breaking Changes
All existing tools maintain backward compatibility. The only change is the addition of the new errors explorer tool.

---

## Verification

### Build Status
```bash
npm run build
# ✓ TypeScript compilation successful
```

### Test Results
```bash
npm test
# ✓ 3 test files passed (35 tests total)
# ✓ All request tests passed
# ✓ All project tests passed
# ✓ All webhook tests passed
```

### Code Quality
- All TypeScript types properly defined
- Zod schemas match OpenAPI parameter specifications
- Error handling consistent across all tools
- Logging for all API operations

---

## References

### OpenAPI Specification
- Source: https://api.currents.dev/v1/docs/openapi.json
- Version: 1.0.0
- All 28 endpoint+method combinations verified

### Currents Implementation
- Private repository (access not available)
- Verification based on OpenAPI specification as authoritative source

### MCP Implementation
- Repository: currents-dev/currents-mcp
- Branch: cursor/currents-mcp-parity-h7m4k2p8
- All tools in `/workspace/mcp-server/src/tools/`

---

## Complete Tool Coverage

The MCP server now provides 100% coverage of all public Currents REST API endpoints:

### Actions (7 tools)
- ✓ List, Create, Get, Update, Delete, Enable, Disable

### Projects (3 tools)
- ✓ List, Get, Get Insights

### Runs (7 tools)
- ✓ List, Get, Find, Cancel, Reset, Delete, Cancel by GitHub CI

### Instances (1 tool)
- ✓ Get Instance

### Spec Files (1 tool)
- ✓ Get Spec Files Performance

### Tests (3 tools)
- ✓ Get Test Results, Get Tests Performance, Generate Signature

### Errors (1 tool - NEW)
- ✓ Get Errors Explorer

### Webhooks (5 tools)
- ✓ List, Create, Get, Update, Delete

**Total: 28 REST API operations → 28 MCP tools**
