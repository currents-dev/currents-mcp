# Currents MCP ↔ Currents API Parity Matrix

**Date**: 2026-02-18  
**Branch**: `cursor/currents-mcp-parity-7k2m8x`  
**Analyst**: Cloud Agent (Cursor AI)  
**Status**: ✅ **COMPLETE PARITY VERIFIED**

---

## Sources of Truth

1. **OpenAPI Specification**: https://api.currents.dev/v1/docs/openapi.json (v1.0.0)
2. **Currents Implementation**: https://github.com/currents-dev/currents (⚠️ Private - not accessible)
3. **Existing MCP Behavior**: currents-dev/currents-mcp (main branch)

**Note**: The Currents source repository is private and could not be accessed. This analysis is based on the official OpenAPI specification and verification against the existing MCP implementation.

---

## Parity Matrix

| # | Endpoint | Method | OpenAPI Operation | MCP Tool | Status | Verification Notes |
|---|----------|--------|-------------------|----------|--------|--------------------|
| 1 | `/actions` | GET | `listActions` | `currents-list-actions` | ✅ OK | 3 params (projectId, status[], search); all match |
| 2 | `/actions` | POST | `createAction` | `currents-create-action` | ✅ OK | 1 query param + request body; validation constraints match |
| 3 | `/actions/{actionId}` | GET | `getAction` | `currents-get-action` | ✅ OK | Path param; no discrepancies |
| 4 | `/actions/{actionId}` | PUT | `updateAction` | `currents-update-action` | ✅ OK | Path param + request body; partial update supported |
| 5 | `/actions/{actionId}` | DELETE | `deleteAction` | `currents-delete-action` | ✅ OK | Soft delete (archive); correctly implemented |
| 6 | `/actions/{actionId}/enable` | PUT | `enableAction` | `currents-enable-action` | ✅ OK | Path param; status change operation |
| 7 | `/actions/{actionId}/disable` | PUT | `disableAction` | `currents-disable-action` | ✅ OK | Path param; status change operation |
| 8 | `/instances/{instanceId}` | GET | `getInstance` | `currents-get-spec-instance` | ✅ OK | Debugging data retrieval; full schema match |
| 9 | `/projects` | GET | `listProjects` | `currents-get-projects` | ✅ OK | Cursor pagination + enhanced `fetchAll`; default limit=10 |
| 10 | `/projects/{projectId}` | GET | `getProject` | `currents-get-project` | ✅ OK | Single project retrieval; no issues |
| 11 | `/projects/{projectId}/insights` | GET | `getProjectInsights` | `currents-get-project-insights` | ✅ OK | 8 params; resolution default='1d'; all filters present |
| 12 | `/projects/{projectId}/runs` | GET | `listProjectRuns` | `currents-get-runs` | ✅ OK | 16 params; complex filtering (tags[], branches[], status, completion_state, date range); tag_operator default='AND'; all match |
| 13 | `/runs/cancel-ci/github` | PUT | `cancelRunByGithubCI` | `currents-cancel-run-github-ci` | ✅ OK | Request body with githubRunId, githubRunAttempt; optional scoping |
| 14 | `/runs/find` | GET | `findRun` | `currents-find-run` | ✅ OK | 5 params; ciBuildId exact match + branch/tags filtering; pwLastRun flag |
| 15 | `/runs/{runId}` | GET | `getRun` | `currents-get-run-details` | ✅ OK | Path param; full run details |
| 16 | `/runs/{runId}` | DELETE | `deleteRun` | `currents-delete-run` | ✅ OK | Permanent deletion; correctly implemented |
| 17 | `/runs/{runId}/cancel` | PUT | `cancelRun` | `currents-cancel-run` | ✅ OK | Cancel in-progress run; no body required |
| 18 | `/runs/{runId}/reset` | PUT | `resetRun` | `currents-reset-run` | ✅ OK | Request body with machineId[]; max 63 machines; isBatchedOr8n support |
| 19 | `/signature/test` | POST | `getTestSignature` | `currents-get-tests-signatures` | ✅ OK | Request body; supports string or array testTitle |
| 20 | `/spec-files/{projectId}` | GET | `getSpecFiles` | `currents-get-spec-files-performance` | ✅ OK | 13 params; page pagination; 10 ordering options; defaults match |
| 21 | `/test-results/{signature}` | GET | `getTestResults` | `currents-get-test-results` | ✅ OK | 16 params (note: OpenAPI has legacy aliases); cursor pagination; flaky filter |
| 22 | `/tests/{projectId}` | GET | `getTestsExplorer` | `currents-get-tests-performance` | ✅ OK | 16 params; 12 ordering options; metric_settings JSON string; all match |
| 23 | `/webhooks` | GET | `listWebhooks` | `currents-list-webhooks` | ✅ OK | 1 param (projectId); simple list operation |
| 24 | `/webhooks` | POST | `createWebhook` | `currents-create-webhook` | ✅ OK | Request body; hookEvents default=[]; validation constraints correct |
| 25 | `/webhooks/{hookId}` | GET | `getWebhook` | `currents-get-webhook` | ✅ OK | UUID path param; full webhook details |
| 26 | `/webhooks/{hookId}` | PUT | `updateWebhook` | `currents-update-webhook` | ✅ OK | Partial update; all fields optional; correctly implemented |
| 27 | `/webhooks/{hookId}` | DELETE | `deleteWebhook` | `currents-delete-webhook` | ✅ OK | Permanent deletion; UUID param |

---

## Summary of Fixes

**No fixes required** - Complete parity already achieved.

### Recent Improvements (Already Merged)
The following fixes were recently applied and are already present in the codebase:

- **PR #55** (Feb 10, 2026): Fixed parameter naming to use modern bracket notation
  - `get-runs.ts`: Uses `branches[]`, `tags[]`, `authors[]` (not singular forms)
  - `find-run.ts`: Uses `tags[]` (not `tag[]`)
  - `get-test-results.ts`: Uses `branches[]`, `tags[]`, `authors[]`, `groups[]` (not legacy names)

- **PR #47** (Feb 4, 2026): Aligned MCP tools with OpenAPI specification
  - Fixed test performance tool order parameter enum values (camelCase)
  - Added missing `durationDelta` enum value

### Verification Details

#### Parameters
- ✅ All path parameters correctly extracted and validated
- ✅ All query parameters use correct naming (brackets for arrays where specified)
- ✅ All request bodies match OpenAPI schemas
- ✅ Default values correctly applied in handlers
- ✅ Required vs optional fields match specification

#### Pagination
- ✅ Cursor-based pagination (projects, runs, test-results) correctly implemented
- ✅ Page-based pagination (spec-files, tests) correctly implemented
- ✅ `has_more` and `nextPage` response fields handled appropriately

#### Validation
- ✅ String length constraints (min/max) properly enforced via Zod
- ✅ Array size constraints (e.g., machineId max 63) correctly implemented
- ✅ Enum values match OpenAPI (status, events, operators, ordering fields)
- ✅ Nullable fields properly handled

#### Enhanced Features (Non-Breaking)
- ✅ `fetchAll` parameter on `currents-get-projects` - enables automatic pagination (MCP enhancement, does not break API compliance)

---

## API Categories Coverage

### Actions API (7/7 endpoints) ✅
Complete CRUD operations for test actions with complex matcher rules.

**Endpoints**:
- GET `/actions` - List with filtering
- POST `/actions` - Create with validation
- GET `/actions/{actionId}` - Get single
- PUT `/actions/{actionId}` - Update
- DELETE `/actions/{actionId}` - Archive
- PUT `/actions/{actionId}/enable` - Enable
- PUT `/actions/{actionId}/disable` - Disable

**OpenAPI Reference**: Components → Schemas → CreateActionRequest, UpdateActionRequest, ActionResponse  
**MCP Files**: `mcp-server/src/tools/actions/*.ts`

### Projects API (3/3 endpoints) ✅
Project management and insights with timeline data.

**Endpoints**:
- GET `/projects` - List with cursor pagination
- GET `/projects/{projectId}` - Get single
- GET `/projects/{projectId}/insights` - Aggregated metrics

**OpenAPI Reference**: Components → Schemas → ProjectsListResponse, ProjectResponse, ProjectInsightsResponse  
**MCP Files**: `mcp-server/src/tools/projects/*.ts`

### Runs API (7/7 endpoints) ✅
Complete run lifecycle and CI integration.

**Endpoints**:
- GET `/projects/{projectId}/runs` - List with extensive filtering
- GET `/runs/{runId}` - Get details
- GET `/runs/find` - Find by criteria
- PUT `/runs/{runId}/cancel` - Cancel
- PUT `/runs/{runId}/reset` - Reset failed specs
- DELETE `/runs/{runId}` - Delete
- PUT `/runs/cancel-ci/github` - GitHub CI cancellation

**OpenAPI Reference**: Components → Schemas → RunsListResponse, RunResponse, ResetRunRequest, CancelRunGithubCIRequest  
**MCP Files**: `mcp-server/src/tools/runs/*.ts`

### Instances API (1/1 endpoint) ✅
Spec file execution debugging.

**Endpoints**:
- GET `/instances/{instanceId}` - Get instance details

**OpenAPI Reference**: Components → Schemas → InstanceResponse, Instance  
**MCP Files**: `mcp-server/src/tools/specs/get-spec-instances.ts`

### Spec Files API (1/1 endpoint) ✅
Spec file performance metrics.

**Endpoints**:
- GET `/spec-files/{projectId}` - Performance metrics with 10 ordering options

**OpenAPI Reference**: Components → Schemas → SpecFilesResponse, SpecFile  
**MCP Files**: `mcp-server/src/tools/specs/get-spec-files-performance.ts`

### Tests API (2/2 endpoints) ✅
Test performance and results exploration.

**Endpoints**:
- GET `/tests/{projectId}` - Test explorer with 12 ordering options
- POST `/signature/test` - Generate test signature

**OpenAPI Reference**: Components → Schemas → TestsExplorerResponse, TestSignatureRequest  
**MCP Files**: `mcp-server/src/tools/tests/*.ts`

### Test Results API (1/1 endpoint) ✅
Historical test execution data.

**Endpoints**:
- GET `/test-results/{signature}` - Historical results with filtering

**OpenAPI Reference**: Components → Schemas → TestResultsResponse, TestResult  
**MCP Files**: `mcp-server/src/tools/tests/get-test-results.ts`

### Webhooks API (5/5 endpoints) ✅
Webhook management for event notifications.

**Endpoints**:
- GET `/webhooks` - List
- POST `/webhooks` - Create
- GET `/webhooks/{hookId}` - Get single
- PUT `/webhooks/{hookId}` - Update
- DELETE `/webhooks/{hookId}` - Delete

**OpenAPI Reference**: Components → Schemas → CreateWebhookRequest, UpdateWebhookRequest, WebhookResponse  
**MCP Files**: `mcp-server/src/tools/webhooks/*.ts`

---

## Verification

### Tests
```bash
$ npm test
✓ src/lib/request.test.ts (13 tests)
✓ src/tools/projects/get-projects.test.ts (3 tests)
✓ src/tools/webhooks/webhooks.test.ts (19 tests)

Test Files  3 passed (3)
     Tests  35 passed (35)
```

### Build
```bash
$ npm run build
TypeScript compilation: ✅ Success
```

### Type Safety
- All tools use Zod schemas for runtime validation
- Schemas match OpenAPI type definitions
- Proper handling of optional, required, and nullable fields

---

## References

### OpenAPI Specification
- **URL**: https://api.currents.dev/v1/docs/openapi.json
- **Version**: 1.0.0
- **Servers**: Production, Staging, Local
- **Authentication**: Bearer token (API key)

### Currents Implementation
- **Repository**: https://github.com/currents-dev/currents (private)
- **Path**: packages/api/src/api
- **Status**: ⚠️ Not accessible (private repository)

### MCP Implementation
- **Repository**: https://github.com/currents-dev/currents-mcp
- **Version**: 2.2.6
- **Branch Analyzed**: main (commit a14728c)
- **Tools Location**: mcp-server/src/tools/

---

## Notable Implementation Details

### Parameter Naming Convention
The OpenAPI spec includes both legacy and modern parameter names for backward compatibility:
- **Legacy**: `tag`, `branch`, `author`, `group` (singular, no brackets)
- **Modern**: `tags[]`, `branches[]`, `authors[]`, `groups[]` (plural with brackets)

**MCP Implementation**: Uses modern parameter names exclusively, which is correct.

### Pagination Strategies
1. **Cursor-based** (projects, runs, test-results):
   - Parameters: `limit`, `starting_after`, `ending_before`
   - Response includes `has_more` boolean
   
2. **Page-based** (spec-files, tests):
   - Parameters: `page`, `limit`
   - Response includes `nextPage` (integer or false)

### Default Values Applied
All default values from OpenAPI spec are correctly implemented:
- `limit=10` (projects, runs, test-results)
- `limit=50` (spec-files, tests)
- `page=0` (spec-files, tests)
- `resolution='1d'` (project insights)
- `tag_operator='AND'` (runs filtering)
- `order`, `dir` (various endpoints with sorting)
- `includeFailedInDuration=false` (spec-files)

### Request Body Validation
All POST/PUT endpoints implement proper Zod validation matching OpenAPI:
- **Actions**: Complex nested structures (RuleAction, RuleMatcher, conditions)
- **Webhooks**: String length constraints, event enums
- **Runs**: Reset with machineId array validation
- **Signature**: Support for string or array testTitle

---

## Conclusion

The Currents MCP Server demonstrates **100% endpoint coverage** and **complete parameter/schema alignment** with the OpenAPI specification (27/27 endpoints).

**Status**: ✅ **NO CHANGES REQUIRED**

The implementation is production-ready and maintains full API parity. All recent parity fixes (PRs #47, #55) have been successfully merged and are included in version 2.2.6.

---

**Next Steps**:
- Monitor OpenAPI spec for future updates
- Consider adding integration tests against live API
- Implement automated parity checks in CI pipeline
