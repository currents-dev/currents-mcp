# Parity: currents-mcp ↔ Currents API

**Branch**: `cursor/currents-mcp-parity-7k2m8x`  
**Date**: February 18, 2026  
**Status**: ✅ **COMPLETE PARITY VERIFIED**

---

## Overview

This PR provides comprehensive verification that the Currents MCP Server maintains complete parity with the Currents REST API. After systematic analysis of all endpoints, parameters, request bodies, and response schemas, **no discrepancies were found**.

**Result**: 27/27 endpoints fully implemented with correct behavior.

---

## Parity Matrix

| # | Endpoint | Method | OpenAPI Operation | MCP Tool | Status | Verification Notes |
|---|----------|--------|-------------------|----------|--------|--------------------|
| 1 | `/actions` | GET | `listActions` | `currents-list-actions` | ✅ OK | 3 params (projectId, status[], search) |
| 2 | `/actions` | POST | `createAction` | `currents-create-action` | ✅ OK | Query param + request body with validation |
| 3 | `/actions/{actionId}` | GET | `getAction` | `currents-get-action` | ✅ OK | Globally unique actionId |
| 4 | `/actions/{actionId}` | PUT | `updateAction` | `currents-update-action` | ✅ OK | Partial update support |
| 5 | `/actions/{actionId}` | DELETE | `deleteAction` | `currents-delete-action` | ✅ OK | Soft delete (archive) |
| 6 | `/actions/{actionId}/enable` | PUT | `enableAction` | `currents-enable-action` | ✅ OK | Status transition |
| 7 | `/actions/{actionId}/disable` | PUT | `disableAction` | `currents-disable-action` | ✅ OK | Status transition |
| 8 | `/instances/{instanceId}` | GET | `getInstance` | `currents-get-spec-instance` | ✅ OK | Debugging data with test attempts |
| 9 | `/projects` | GET | `listProjects` | `currents-get-projects` | ✅ OK | Cursor pagination + fetchAll enhancement |
| 10 | `/projects/{projectId}` | GET | `getProject` | `currents-get-project` | ✅ OK | Single project details |
| 11 | `/projects/{projectId}/insights` | GET | `getProjectInsights` | `currents-get-project-insights` | ✅ OK | Timeline data with resolution (1h/1d/1w) |
| 12 | `/projects/{projectId}/runs` | GET | `listProjectRuns` | `currents-get-runs` | ✅ OK | 16 params with complex filtering |
| 13 | `/runs/cancel-ci/github` | PUT | `cancelRunByGithubCI` | `currents-cancel-run-github-ci` | ✅ OK | GitHub CI workflow integration |
| 14 | `/runs/find` | GET | `findRun` | `currents-find-run` | ✅ OK | Find by ciBuildId or branch/tags |
| 15 | `/runs/{runId}` | GET | `getRun` | `currents-get-run-details` | ✅ OK | Full run details |
| 16 | `/runs/{runId}` | DELETE | `deleteRun` | `currents-delete-run` | ✅ OK | Permanent deletion |
| 17 | `/runs/{runId}/cancel` | PUT | `cancelRun` | `currents-cancel-run` | ✅ OK | Cancel in-progress run |
| 18 | `/runs/{runId}/reset` | PUT | `resetRun` | `currents-reset-run` | ✅ OK | Reset failed specs (max 63 machines) |
| 19 | `/signature/test` | POST | `getTestSignature` | `currents-get-tests-signatures` | ✅ OK | String or array testTitle |
| 20 | `/spec-files/{projectId}` | GET | `getSpecFiles` | `currents-get-spec-files-performance` | ✅ OK | 13 params, 10 ordering options |
| 21 | `/test-results/{signature}` | GET | `getTestResults` | `currents-get-test-results` | ✅ OK | Historical data with flaky filter |
| 22 | `/tests/{projectId}` | GET | `getTestsExplorer` | `currents-get-tests-performance` | ✅ OK | 16 params, 12 ordering options |
| 23 | `/webhooks` | GET | `listWebhooks` | `currents-list-webhooks` | ✅ OK | Project-scoped list |
| 24 | `/webhooks` | POST | `createWebhook` | `currents-create-webhook` | ✅ OK | hookEvents default=[] |
| 25 | `/webhooks/{hookId}` | GET | `getWebhook` | `currents-get-webhook` | ✅ OK | UUID-based retrieval |
| 26 | `/webhooks/{hookId}` | PUT | `updateWebhook` | `currents-update-webhook` | ✅ OK | Partial update |
| 27 | `/webhooks/{hookId}` | DELETE | `deleteWebhook` | `currents-delete-webhook` | ✅ OK | Permanent deletion |

**Coverage**: 27/27 (100%)

---

## Summary of Fixes

**No implementation changes required**.

The codebase already maintains complete parity with the Currents REST API. Recent PRs (#47, #55) successfully addressed parameter naming and validation issues.

### What Was Verified
- ✅ All 27 REST API endpoints have corresponding MCP tools
- ✅ Parameter names use correct modern syntax (brackets for arrays)
- ✅ Default values match OpenAPI specification
- ✅ Request body schemas include all validation constraints
- ✅ Response handling follows consistent patterns
- ✅ Pagination strategies correctly implemented
- ✅ Type safety enforced via Zod
- ✅ Error handling is consistent

### Recent Improvements Already Merged
- **PR #55** (Feb 10, 2026): Fixed parameter naming for `get-runs`, `find-run`, `get-test-results`
- **PR #47** (Feb 4, 2026): Aligned enum values and added missing parameters

---

## Verification

### Build Status
```bash
$ npm run build
✅ TypeScript compilation successful
✅ No type errors
✅ Output: build/index.js (executable)
```

### Test Results
```bash
$ npm test

✓ src/lib/request.test.ts (13 tests)
✓ src/tools/projects/get-projects.test.ts (3 tests)  
✓ src/tools/webhooks/webhooks.test.ts (19 tests)

Test Files  3 passed (3)
     Tests  35 passed (35)
   Duration  407ms
```

**Result**: ✅ All tests pass

### Coverage Summary
- Request utilities: Comprehensive tests for fetch, post, put, delete operations
- Projects API: Pagination and fetchAll functionality
- Webhooks API: Full CRUD operation tests

---

## References

### OpenAPI Specification
- **URL**: https://api.currents.dev/v1/docs/openapi.json
- **Version**: 1.0.0
- **Base URL**: https://api.currents.dev/v1
- **Authentication**: Bearer token

### Currents Implementation
- **Repository**: https://github.com/currents-dev/currents
- **Target Path**: packages/api/src/api
- **Access Status**: ⚠️ Private repository (not accessible without credentials)
- **Note**: Analysis based on OpenAPI spec as primary source of truth

### Documentation Links
- [Currents API Docs](https://docs.currents.dev/api)
- [Currents Dashboard](https://app.currents.dev)
- [OpenAPI Spec](https://api.currents.dev/v1/docs/openapi.json)

### Related Files
- **Detailed Analysis**: See `PARITY_MATRIX_7k2m8x.md` for complete parity documentation
- **Previous Analysis**: See `PARITY_ANALYSIS.md` for historical reference (Feb 4, 2026)

---

## Methodology

1. **Spec Collection**:
   - Downloaded OpenAPI specification (60KB JSON)
   - Parsed all 27 endpoint definitions with parameters and schemas
   
2. **Tool Inventory**:
   - Analyzed all 27 MCP tools in `mcp-server/src/tools/`
   - Extracted Zod schemas and handler implementations
   - Verified parameter mappings and query string generation

3. **Comparison**:
   - Systematically compared each endpoint's parameters
   - Verified request body schemas against OpenAPI
   - Checked default values and constraints
   - Validated pagination implementations

4. **Verification**:
   - Built project successfully
   - Ran test suite (35 tests, all passing)
   - Reviewed recent parity-related PRs and commits

---

## Conclusion

The Currents MCP Server is at **complete parity** with the Currents REST API as defined by the OpenAPI specification. No changes to the implementation are required.

This PR serves as documentation and verification of the current parity status as of February 18, 2026.

**Status**: ✅ **FULL PARITY CERTIFIED**
