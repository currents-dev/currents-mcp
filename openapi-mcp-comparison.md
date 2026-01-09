# OpenAPI to MCP Server Parity Analysis

## Summary

### Missing MCP Tools (from OpenAPI)
1. **Actions API** - Complete category missing (7 endpoints)
   - List actions: GET /actions
   - Create action: POST /actions
   - Get action: GET /actions/{actionId}
   - Update action: PUT /actions/{actionId}
   - Delete action: DELETE /actions/{actionId}
   - Enable action: PUT /actions/{actionId}/enable
   - Disable action: PUT /actions/{actionId}/disable

2. **Projects API** - Partial coverage
   - ✓ List projects: GET /projects (implemented)
   - ✗ Get project: GET /projects/{projectId} (missing)
   - ✓ List project runs: GET /projects/{projectId}/runs (implemented)
   - ✗ Get project insights: GET /projects/{projectId}/insights (missing)

3. **Runs API** - Partial coverage
   - ✓ Get run: GET /runs/{runId} (implemented)
   - ✗ Delete run: DELETE /runs/{runId} (missing)
   - ✗ Find run: GET /runs/find (missing)
   - ✗ Cancel run: PUT /runs/{runId}/cancel (missing)
   - ✗ Reset run: PUT /runs/{runId}/reset (missing)
   - ✗ Cancel run by GitHub CI: PUT /runs/cancel-ci/github (missing)

### Parameter Mismatches in Existing Tools

#### 1. currents-get-projects
**OpenAPI Spec**: GET /projects
- Parameters:
  - limit (optional, integer, default: 10, max: 100)
  - starting_after (optional, string)
  - ending_before (optional, string)

**Current MCP**: No parameters accepted
- ❌ Missing pagination support

#### 2. currents-get-spec-files-performance  
**OpenAPI Spec**: GET /spec-files/{projectId}
- date_start (REQUIRED in OpenAPI)
- date_end (REQUIRED in OpenAPI)

**Current MCP**: 
- date_start (optional with default)
- date_end (optional with default)

- ⚠️ Spec says required, but MCP has sensible defaults. This is acceptable but not strictly matching.

### Correct Implementations ✓

1. **currents-get-runs** - Fully matches OpenAPI GET /projects/{projectId}/runs
2. **currents-get-run-details** - Fully matches OpenAPI GET /runs/{runId}
3. **currents-get-spec-instance** - Fully matches OpenAPI GET /instances/{instanceId}
4. **currents-get-tests-performance** - Fully matches OpenAPI GET /tests/{projectId}
5. **currents-get-tests-signatures** - Fully matches OpenAPI POST /signature/test
6. **currents-get-test-results** - Fully matches OpenAPI GET /test-results/{signature}

## Detailed OpenAPI Endpoints

### Actions API (All Missing)

#### 1. List Actions
- **Method**: GET
- **Path**: /actions
- **Parameters**:
  - projectId (query, required, string)
  - status (query, optional, array of enum: active/disabled/archived/expired)
  - search (query, optional, string, max 100 chars)

#### 2. Create Action
- **Method**: POST
- **Path**: /actions
- **Parameters**:
  - projectId (query, required, string)
- **Body**: CreateActionRequest (name, description, action array, matcher, expiresAfter)

#### 3. Get Action
- **Method**: GET
- **Path**: /actions/{actionId}
- **Parameters**:
  - actionId (path, required, string)

#### 4. Update Action
- **Method**: PUT
- **Path**: /actions/{actionId}
- **Parameters**:
  - actionId (path, required, string)
- **Body**: UpdateActionRequest

#### 5. Delete Action
- **Method**: DELETE
- **Path**: /actions/{actionId}
- **Parameters**:
  - actionId (path, required, string)

#### 6. Enable Action
- **Method**: PUT
- **Path**: /actions/{actionId}/enable
- **Parameters**:
  - actionId (path, required, string)

#### 7. Disable Action
- **Method**: PUT
- **Path**: /actions/{actionId}/disable
- **Parameters**:
  - actionId (path, required, string)

### Projects API (Partial Coverage)

#### Get Project (Missing)
- **Method**: GET
- **Path**: /projects/{projectId}
- **Parameters**:
  - projectId (path, required, string)

#### Get Project Insights (Missing)
- **Method**: GET
- **Path**: /projects/{projectId}/insights
- **Parameters**:
  - projectId (path, required, string)
  - date_start (query, required, date-time)
  - date_end (query, required, date-time)
  - resolution (query, optional, enum: 1h/1d/1w, default: 1d)
  - tags (query, optional, array of strings)
  - branches (query, optional, array of strings)
  - groups (query, optional, array of strings)
  - authors (query, optional, array of strings)

### Runs API (Partial Coverage)

#### Delete Run (Missing)
- **Method**: DELETE
- **Path**: /runs/{runId}
- **Parameters**:
  - runId (path, required, string)

#### Find Run (Missing)
- **Method**: GET
- **Path**: /runs/find
- **Parameters**:
  - projectId (query, required, string)
  - ciBuildId (query, optional, string)
  - branch (query, optional, string)
  - tag (query, optional, array of strings)
  - pwLastRun (query, optional, boolean)

#### Cancel Run (Missing)
- **Method**: PUT
- **Path**: /runs/{runId}/cancel
- **Parameters**:
  - runId (path, required, string)

#### Reset Run (Missing)
- **Method**: PUT
- **Path**: /runs/{runId}/reset
- **Parameters**:
  - runId (path, required, string)
- **Body**: ResetRunRequest (machineId array, isBatchedOr8n)

#### Cancel Run by GitHub CI (Missing)
- **Method**: PUT
- **Path**: /runs/cancel-ci/github
- **Body**: CancelRunGithubCIRequest (githubRunId, githubRunAttempt, projectId, ciBuildId)

## Recommendations

1. **Add pagination support to currents-get-projects**
2. **Add all Actions API endpoints** (7 new tools)
3. **Add missing Projects API endpoints** (2 new tools)
4. **Add missing Runs API endpoints** (5 new tools)
5. **Keep existing implementations as they correctly match the spec**
