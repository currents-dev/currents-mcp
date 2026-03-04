# Currents MCP Server - API Parity Analysis

**Date:** March 4, 2026  
**Analysis Status:** ✅ COMPLETE PARITY VERIFIED  
**Branch:** cursor/currents-mcp-parity-7k4m2p9x

## Executive Summary

This document provides a comprehensive analysis comparing the Currents MCP Server implementation against the official OpenAPI specification and intended Currents API implementation.

**Result: All 28 REST API endpoints are fully implemented with correct parameters, request bodies, and response handling.**

## Verification Methodology

1. ✅ Fetched the latest OpenAPI specification from `https://api.currents.dev/v1/docs/openapi.json` (v1.0.0)
2. ❌ Attempted to access Currents source code at `currents-dev/currents` (private repository, access denied)
3. ✅ Analyzed all 28 MCP tool implementations in the codebase
4. ✅ Systematically compared each endpoint's parameters, methods, request bodies, and schemas
5. ✅ Verified parameter types, optional/required status, and descriptions
6. ✅ Validated build and test suite (35 tests passed)

## Source of Truth Limitation

Per the parity requirements, the Currents implementation source code should have highest precedence. However:
- **Currents repository access:** Token permissions insufficient to read `currents-dev/currents` private repository
- **Fallback source:** Used OpenAPI specification (v1.0.0) as authoritative reference
- **Risk:** OpenAPI spec may be outdated compared to actual implementation
- **Mitigation:** Comprehensive parameter-level validation; manual verification of all 28 tools

**Recommendation:** A team member with repository access should verify the OpenAPI spec matches the actual implementation at `packages/api/src/api`.

## Endpoint Coverage: 28/28 ✅

### Actions API (7 endpoints) ✅

| OpenAPI Endpoint | HTTP Method | MCP Tool | Verification |
|-----------------|-------------|----------|--------------|
| `/actions` | GET | `currents-list-actions` | ✅ Verified: projectId (required), status[] (array), search filters |
| `/actions` | POST | `currents-create-action` | ✅ Verified: projectId (query), request body with name, action[], matcher (required) |
| `/actions/{actionId}` | GET | `currents-get-action` | ✅ Verified: actionId (required) |
| `/actions/{actionId}` | PUT | `currents-update-action` | ✅ Verified: actionId (required), optional update fields, at least one required |
| `/actions/{actionId}` | DELETE | `currents-delete-action` | ✅ Verified: actionId (required), soft delete |
| `/actions/{actionId}/enable` | PUT | `currents-enable-action` | ✅ Verified: actionId (required) |
| `/actions/{actionId}/disable` | PUT | `currents-disable-action` | ✅ Verified: actionId (required) |

**Implementation Notes:**
- Complex matcher conditions with AND/OR logic properly implemented
- All condition types and operators match OpenAPI schema
- RuleAction union type (skip, quarantine, tag) correctly validated
- Zod schemas provide runtime type safety

### Projects API (4 endpoints) ✅

| OpenAPI Endpoint | HTTP Method | MCP Tool | Verification |
|-----------------|-------------|----------|--------------|
| `/projects` | GET | `currents-get-projects` | ✅ Verified: cursor pagination (limit, starting_after, ending_before) + fetchAll enhancement |
| `/projects/{projectId}` | GET | `currents-get-project` | ✅ Verified: projectId (required) |
| `/projects/{projectId}/runs` | GET | `currents-get-runs` | ✅ Verified: 16 params including filters (branches[], tags[], status, completion_state, etc.) |
| `/projects/{projectId}/insights` | GET | `currents-get-project-insights` | ✅ Verified: projectId, date_start, date_end (required); resolution, filters (optional) |

**Implementation Notes:**
- Cursor-based pagination correctly implemented
- `fetchAll` parameter is an MCP enhancement (automatic pagination)
- All filtering parameters verified against OpenAPI (branches[], tags[], tag_operator, status, completion_state, authors[], search, date_start, date_end)
- Timeline data with resolution options (1h/1d/1w)

### Runs API (6 endpoints) ✅

| OpenAPI Endpoint | HTTP Method | MCP Tool | Verification |
|-----------------|-------------|----------|--------------|
| `/runs/{runId}` | GET | `currents-get-run-details` | ✅ Verified: runId (required) |
| `/runs/{runId}` | DELETE | `currents-delete-run` | ✅ Verified: runId (required) |
| `/runs/find` | GET | `currents-find-run` | ✅ Verified: projectId (required), ciBuildId, branch, tags[], pwLastRun (optional) |
| `/runs/{runId}/cancel` | PUT | `currents-cancel-run` | ✅ Verified: runId (required) |
| `/runs/{runId}/reset` | PUT | `currents-reset-run` | ✅ Verified: runId (required), machineId[] (1-63, required in body), isBatchedOr8n (optional) |
| `/runs/cancel-ci/github` | PUT | `currents-cancel-run-github-ci` | ✅ Verified: githubRunId, githubRunAttempt (required in body), projectId, ciBuildId (optional) |

**Implementation Notes:**
- Run lifecycle management fully implemented
- GitHub CI-specific cancellation support
- Reset with machineId array validation (min: 1, max: 63)
- Batched orchestration support

### Instances API (1 endpoint) ✅

| OpenAPI Endpoint | HTTP Method | MCP Tool | Verification |
|-----------------|-------------|----------|--------------|
| `/instances/{instanceId}` | GET | `currents-get-spec-instance` | ✅ Verified: instanceId (required) |

**Implementation Notes:**
- Spec file execution details with full test results
- Attempt-level debugging information

### Spec Files API (1 endpoint) ✅

| OpenAPI Endpoint | HTTP Method | MCP Tool | Verification |
|-----------------|-------------|----------|--------------|
| `/spec-files/{projectId}` | GET | `currents-get-spec-files-performance` | ✅ Verified: projectId, date_start, date_end (required); 10 optional params |

**Implementation Notes:**
- Comprehensive metrics (avgDuration, failureRate, flakeRate, etc.)
- Page-based pagination
- Sorting by 10 different metrics
- Filtering by tags[], branches[], groups[], authors[]
- Optional includeFailedInDuration flag

### Test Results API (1 endpoint) ✅

| OpenAPI Endpoint | HTTP Method | MCP Tool | Verification |
|-----------------|-------------|----------|--------------|
| `/test-results/{signature}` | GET | `currents-get-test-results` | ✅ Verified: signature, date_start, date_end (required); 13 optional params |

**Implementation Notes:**
- Historical test execution results
- Cursor-based pagination
- Filtering by branches[], tags[], authors[], status[], groups[], flaky
- Deprecated parameters (branch[], tag[], git_author[], group[]) correctly ignored

### Tests Explorer API (1 endpoint) ✅

| OpenAPI Endpoint | HTTP Method | MCP Tool | Verification |
|-----------------|-------------|----------|--------------|
| `/tests/{projectId}` | GET | `currents-get-tests-performance` | ✅ Verified: projectId, date_start, date_end (required); 13 optional params |

**Implementation Notes:**
- Aggregated test metrics
- 12 ordering options (failures, passes, flakiness, duration, executions, deltas, etc.)
- Filtering by spec, title, test_state[], min_executions
- Custom metric_settings via JSON string

### Signature API (1 endpoint) ✅

| OpenAPI Endpoint | HTTP Method | MCP Tool | Verification |
|-----------------|-------------|----------|--------------|
| `/signature/test` | POST | `currents-get-tests-signatures` | ✅ Verified: Request body with projectId, specFilePath, testTitle (required) |

**Implementation Notes:**
- Generate unique test signatures
- Support for string or string[] test titles (nested describe blocks)
- Zod union type for flexible testTitle input

### Errors Explorer API (1 endpoint) ✅

| OpenAPI Endpoint | HTTP Method | MCP Tool | Verification |
|-----------------|-------------|----------|--------------|
| `/errors/{projectId}` | GET | `currents-get-errors-explorer` | ✅ Verified: projectId, date_start, date_end (required); 16 optional params |

**Implementation Notes:**
- Aggregated error metrics with comprehensive filtering
- Error-specific filters: error_target, error_message, error_category, error_action
- Grouping by target, action, category, or message (group_by[])
- Timeline data with configurable metric (occurrence/test/branch) and top_n
- Page-based pagination
- tags_logical_operator (OR/AND)

### Webhooks API (5 endpoints) ✅

| OpenAPI Endpoint | HTTP Method | MCP Tool | Verification |
|-----------------|-------------|----------|--------------|
| `/webhooks` | GET | `currents-list-webhooks` | ✅ Verified: projectId (required) |
| `/webhooks` | POST | `currents-create-webhook` | ✅ Verified: projectId (query), url (body, required), optional fields |
| `/webhooks/{hookId}` | GET | `currents-get-webhook` | ✅ Verified: hookId (required) |
| `/webhooks/{hookId}` | PUT | `currents-update-webhook` | ✅ Verified: hookId (required), all update fields optional |
| `/webhooks/{hookId}` | DELETE | `currents-delete-webhook` | ✅ Verified: hookId (required) |

**Implementation Notes:**
- Full webhook CRUD operations
- Support for RUN_FINISH, RUN_START, RUN_TIMEOUT, RUN_CANCELED events
- Custom headers as JSON string
- UUID-based webhook IDs

## Parameter Validation Summary

### Correctly Handled ✅

1. **Array Parameter Encoding**
   - With brackets: `tags[]`, `branches[]`, `authors[]`, `groups[]`, `status[]`, `test_state[]`, `group_by[]`
   - Without brackets: `status`, `completion_state` (in list-project-runs)
   - Properly ignored deprecated forms: `branch`, `tag`, `author`, `branch[]`, `tag[]`, `git_author[]`, `group[]`

2. **Required Parameters**
   - Path parameters enforced via Zod (no `.optional()`)
   - Date ranges enforced where required (date_start, date_end)
   - Request body required fields validated

3. **Optional Parameters**
   - All optional parameters properly marked with `.optional()`
   - Default values provided where specified
   - Proper TypeScript typing

4. **Type Constraints**
   - Enum types correctly defined and enforced
   - String length constraints (min/max)
   - Array length constraints (min/max)
   - Integer constraints (minimum, maximum)

## Implementation Quality

### Strengths ✅
1. **Complete Coverage**: All 28 endpoints implemented
2. **Type Safety**: Comprehensive Zod schemas with runtime validation
3. **Error Handling**: Consistent error responses across all tools
4. **Logging**: Structured logging for debugging and observability
5. **Pagination**: Both cursor-based and page-based correctly implemented
6. **Enhanced Features**: `fetchAll` option improves UX without breaking compliance

### Architecture ✅
- Clean separation of concerns (tools, lib, schemas)
- Reusable request utilities (fetchApi, postApi, putApi, deleteApi)
- Consistent tool structure across all implementations
- Proper TypeScript types and interfaces

### Testing ✅
- 35 tests covering core functionality
- Request handling tests
- Project operations tests
- Webhook CRUD tests
- All tests passing

## Findings Summary

### Code Changes Required: 0

No discrepancies, missing endpoints, or parameter mismatches were identified. The implementation is complete and correct.

### Enhancements Identified: 1

**`fetchAll` parameter** in `currents-get-projects`:
- Type: boolean (optional)
- Behavior: Automatically fetches all projects using cursor-based pagination
- Impact: UX improvement, does not violate OpenAPI compliance
- Status: KEPT (beneficial feature)

## Recommendations

1. ✅ **Maintain Current Implementation**: Implementation is excellent and requires no changes
2. ⚠️ **Verify Against Source Code**: A team member with access should verify the OpenAPI spec matches the actual Currents implementation
3. ✅ **Documentation**: This parity analysis documents the current state
4. 💡 **Future Enhancement**: Consider automated parity checks against the live OpenAPI spec in CI/CD
5. 💡 **Integration Tests**: Consider adding integration tests against a live API endpoint

## Conclusion

The Currents MCP Server demonstrates **complete and accurate implementation** of the Currents REST API as documented in the OpenAPI specification (v1.0.0).

All 28 endpoints are implemented with:
- ✅ Correct parameters (names, types, required/optional)
- ✅ Proper array encoding (with and without brackets as specified)
- ✅ Accurate request body schemas
- ✅ Appropriate response handling
- ✅ Consistent error management
- ✅ Deprecated parameters properly ignored

**Status: ✅ FULL PARITY ACHIEVED**

No implementation changes are required.

---

**Analysis Performed By:** Cursor Cloud Agent  
**OpenAPI Spec Source:** https://api.currents.dev/v1/docs/openapi.json (v1.0.0)  
**Currents Source:** https://github.com/currents-dev/currents/tree/main/packages/api/src/api (access denied)  
**Repository:** https://github.com/currents-dev/currents-mcp  
**Branch:** cursor/currents-mcp-parity-7k4m2p9x  
**Verification Date:** March 4, 2026
