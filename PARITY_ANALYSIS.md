# Currents MCP Parity Analysis

## Executive Summary

This document details the analysis performed to ensure full parity between the Currents REST API (as defined in the OpenAPI specification) and the Currents MCP server implementation.

## Analysis Methodology

1. **OpenAPI Spec Analysis**: Fetched and parsed the OpenAPI specification from `https://api.currents.dev/v1/docs/openapi.json`
2. **MCP Server Analysis**: Examined all MCP tool implementations in the repository
3. **Comparison**: Compared endpoints, parameters, data types, and serialization patterns

## Endpoints Coverage

All endpoints from the OpenAPI specification are correctly implemented in the MCP server:

### Actions API ✓
- `GET /actions` → `currents-list-actions`
- `POST /actions` → `currents-create-action`
- `GET /actions/{actionId}` → `currents-get-action`
- `PUT /actions/{actionId}` → `currents-update-action`
- `DELETE /actions/{actionId}` → `currents-delete-action`
- `PUT /actions/{actionId}/enable` → `currents-enable-action`
- `PUT /actions/{actionId}/disable` → `currents-disable-action`

### Projects API ✓
- `GET /projects` → `currents-get-projects`
- `GET /projects/{projectId}` → `currents-get-project`
- `GET /projects/{projectId}/runs` → `currents-get-runs`
- `GET /projects/{projectId}/insights` → `currents-get-project-insights`

### Runs API ✓
- `GET /runs/{runId}` → `currents-get-run-details`
- `DELETE /runs/{runId}` → `currents-delete-run`
- `GET /runs/find` → `currents-find-run`
- `PUT /runs/{runId}/cancel` → `currents-cancel-run`
- `PUT /runs/{runId}/reset` → `currents-reset-run`
- `PUT /runs/cancel-ci/github` → `currents-cancel-run-github-ci`

### Instances API ✓
- `GET /instances/{instanceId}` → `currents-get-spec-instance`

### Spec Files API ✓
- `GET /spec-files/{projectId}` → `currents-get-spec-files-performance`

### Test Results API ✓
- `GET /test-results/{signature}` → `currents-get-test-results`

### Tests Explorer API ✓
- `GET /tests/{projectId}` → `currents-get-tests-performance`

### Signature API ✓
- `POST /signature/test` → `currents-get-tests-signatures`

### Webhooks API ✓
- `GET /webhooks` → `currents-list-webhooks`
- `POST /webhooks` → `currents-create-webhook`
- `GET /webhooks/{hookId}` → `currents-get-webhook`
- `PUT /webhooks/{hookId}` → `currents-update-webhook`
- `DELETE /webhooks/{hookId}` → `currents-delete-webhook`

## Issues Identified and Fixed

### 1. Tests Performance Tool - Order Parameter Enum Values

**Issue**: The `order` parameter in `/tests/{projectId}` (Tests Explorer) endpoint had incorrect enum values using underscores instead of camelCase.

**OpenAPI Spec Values**:
```
failures, passes, flakiness, flakinessXSamples, failRateXSamples, 
duration, durationDelta, flakinessRateDelta, failureRateDelta, 
durationXSamples, executions, title
```

**Incorrect MCP Values**:
```
failures, passes, flakiness, flakiness_x_samples, failrate_x_samples, 
duration, flakiness_rate_delta, failure_rate_delta, duration_x_samples, 
executions, title
```

**Missing Value**: `durationDelta` was completely missing from the MCP enum.

**Fix**: Updated `mcp-server/src/tools/tests/get-tests-performance.ts` to use correct camelCase enum values matching the OpenAPI spec.

**Impact**: Users can now use the correct parameter values when ordering test results, including the `durationDelta` option.

**OpenAPI Reference**: `/tests/{projectId}` → `order` parameter

### 2. Find Run Tool - Tag Parameter Serialization

**Issue**: The `tag` parameter in `/runs/find` endpoint was not using bracket notation as specified in the OpenAPI spec.

**OpenAPI Spec**: Requires `tag[]` with bracket notation for array parameters.

**Incorrect Implementation**: Used `tag` without brackets when appending query parameters.

**Fix**: Updated `mcp-server/src/tools/runs/find-run.ts` to append parameters as `tag[]` instead of `tag`.

**Impact**: Ensures correct parameter serialization when filtering runs by tags.

**OpenAPI Reference**: `/runs/find` → `tag[]` parameter

## Parameter Serialization Patterns

The analysis confirmed correct parameter serialization across all tools:

### Array Parameters with Bracket Notation
These parameters use bracket notation (`param[]`) in the OpenAPI spec and are correctly implemented:
- `tags[]`, `branches[]`, `groups[]`, `authors[]` in insights, spec-files, and tests endpoints
- `git_author[]`, `status[]`, `group[]`, `test_state[]` in various endpoints
- `tag[]` in find-run endpoint (fixed)

### Array Parameters without Bracket Notation
These parameters don't use bracket notation and are correctly implemented:
- `tag`, `author`, `status`, `completion_state` in project runs endpoint
- `branch`, `tag` in test-results endpoint

## Schema Validation

All request and response schemas match the OpenAPI specification:
- Request body schemas for create/update operations
- Response schemas for all endpoints
- Error response schemas

## Testing

All existing tests pass after the changes:
- ✓ 3 test files
- ✓ 35 tests
- No linter errors

## Conclusion

The Currents MCP server now has full parity with the OpenAPI specification:
- ✅ All endpoints implemented
- ✅ All parameters correctly typed and serialized
- ✅ All enum values match the spec
- ✅ All request/response schemas aligned
- ✅ Existing functionality preserved

## References

- OpenAPI Spec: https://api.currents.dev/v1/docs/openapi.json
- MCP Server Repository: https://github.com/currents-dev/currents-mcp
