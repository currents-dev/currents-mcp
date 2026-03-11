# Currents REST API - Comprehensive Endpoint Reference

**Source:** OpenAPI Specification v1.0.0 from `https://api.currents.dev/v1/docs/openapi.json`
**Base URLs:**
- Production: `https://api.currents.dev/v1`
- Staging: `https://api-staging.currents.dev/v1`

**Authentication:** Bearer token via `Authorization: Bearer <api-key>` header on all requests.

**Date Generated:** March 11, 2026

---

## Table of Contents

1. [Actions API (7 endpoints)](#1-actions-api)
2. [Projects API (4 endpoints)](#2-projects-api)
3. [Runs API (6 endpoints)](#3-runs-api)
4. [Instances API (1 endpoint)](#4-instances-api)
5. [Spec Files API (1 endpoint)](#5-spec-files-api)
6. [Test Results API (1 endpoint)](#6-test-results-api)
7. [Tests Explorer API (1 endpoint)](#7-tests-explorer-api)
8. [Errors Explorer API (1 endpoint)](#8-errors-explorer-api)
9. [Signature API (1 endpoint)](#9-signature-api)
10. [Webhooks API (5 endpoints)](#10-webhooks-api)
11. [Common Schemas](#11-common-schemas)
12. [Pagination Behavior](#12-pagination-behavior)
13. [Error Handling](#13-error-handling)

**Total: 28 endpoints**

---

## 1. Actions API

Actions are rules that automatically modify test behavior (skip, quarantine, or tag tests matching conditions).

### 1.1 List Actions

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/actions` |
| **Operation ID** | `listActions` |

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectId` | string | Yes | The project ID |
| `status` | array of enum | No | Filter by status. Values: `active`, `disabled`, `archived`, `expired`. Repeatable via `status=active&status=disabled`. |
| `search` | string | No | Search actions by name. Max 100 chars. |

**Response (200):** `ActionsListResponse`
```json
{
  "status": "OK",
  "data": [ Action, ... ]
}
```

**Error Responses:** 400 (Bad Request), 401 (Unauthorized), 404 (Not Found)

---

### 1.2 Create Action

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/actions` |
| **Operation ID** | `createAction` |

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectId` | string | Yes | The project ID |

**Request Body (JSON):** `CreateActionRequest`

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | string | Yes | minLength: 1, maxLength: 255 | Human-readable name |
| `description` | string \| null | No | maxLength: 1000 | Optional description |
| `action` | RuleAction[] | Yes | minItems: 1 | Actions to perform (see RuleAction union) |
| `matcher` | RuleMatcher | Yes | — | Matcher defining which tests this applies to |
| `expiresAfter` | date-time \| null | No | ISO 8601 | Optional expiration date |

**RuleAction** (union type, discriminated on `op`):
- `{ "op": "skip" }` — skip matching tests
- `{ "op": "quarantine" }` — quarantine matching tests
- `{ "op": "tag", "details": { "tags": ["tag1", ...] } }` — tag matching tests (maxItems: 10)

**RuleMatcher:**
```json
{
  "op": "AND" | "OR",
  "cond": [
    {
      "type": "<ConditionType>",
      "op": "<ConditionOperator>",
      "value": "string" | ["string", ...] | null
    }
  ]
}
```

**ConditionType** enum: `testId`, `project`, `title`, `file`, `git_branch`, `git_authorName`, `git_authorEmail`, `git_remoteOrigin`, `git_message`, `error_message`, `titlePath`, `annotation`, `tag`

**ConditionOperator** enum:
- Primitive types support: `eq`, `neq`, `any`, `empty`, `in`, `notIn`
- Complex types (`error_message`, `titlePath`, `annotation`, `tag`) also support: `inc`, `notInc`, `incAll`, `notIncAll`

`cond` array: minItems: 1

**Response (201):** `ActionResponse` — `{ "status": "OK", "data": Action }`

**Error Responses:** 400, 401, 404

---

### 1.3 Get Action

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/actions/{actionId}` |
| **Operation ID** | `getAction` |

**Path Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `actionId` | string | Yes | The action ID (globally unique) |

**Response (200):** `ActionResponse` — `{ "status": "OK", "data": Action }`

**Error Responses:** 400, 401, 404

---

### 1.4 Update Action

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **Path** | `/actions/{actionId}` |
| **Operation ID** | `updateAction` |

**Path Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `actionId` | string | Yes | The action ID (globally unique) |

**Request Body (JSON):** `UpdateActionRequest` — All fields optional (partial update). At least one field should be provided.

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | No | minLength: 1, maxLength: 255 |
| `description` | string \| null | No | maxLength: 1000 |
| `action` | RuleAction[] | No | minItems: 1 |
| `matcher` | RuleMatcher | No | — |
| `expiresAfter` | date-time \| null | No | ISO 8601 |

**Response (200):** `ActionResponse`

**Error Responses:** 400, 401, 404

---

### 1.5 Delete Action

| Field | Value |
|-------|-------|
| **Method** | `DELETE` |
| **Path** | `/actions/{actionId}` |
| **Operation ID** | `deleteAction` |

**Path Parameters:** `actionId` (string, required)

**Response (200):** `ActionDeleteResponse`
```json
{
  "status": "OK",
  "data": {
    "actionId": "string",
    "archived": true
  }
}
```

This is a **soft delete** (archive). The action's status changes to `archived`.

**Error Responses:** 400, 401, 404

---

### 1.6 Enable Action

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **Path** | `/actions/{actionId}/enable` |
| **Operation ID** | `enableAction` |

**Path Parameters:** `actionId` (string, required)

**Response (200):** `ActionResponse` — Returns the action with status set to `active`.

**Error Responses:** 400, 401, 404

---

### 1.7 Disable Action

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **Path** | `/actions/{actionId}/disable` |
| **Operation ID** | `disableAction` |

**Path Parameters:** `actionId` (string, required)

**Response (200):** `ActionResponse` — Returns the action with status set to `disabled`.

**Error Responses:** 400, 401, 404

---

### Action Response Schema

```json
{
  "actionId": "string",
  "name": "string",
  "description": "string | null",
  "action": [ RuleAction, ... ],
  "matcher": RuleMatcher,
  "status": "active | disabled | archived | expired",
  "createdAt": "ISO 8601 date-time",
  "createdBy": "email string",
  "updatedAt": "ISO 8601 | null",
  "updatedBy": "string | null",
  "disabledAt": "ISO 8601 | null",
  "disabledBy": "string | null",
  "archivedAt": "ISO 8601 | null",
  "archivedBy": "string | null",
  "expiresAfter": "ISO 8601 | null"
}
```

---

## 2. Projects API

### 2.1 List Projects

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/projects` |
| **Operation ID** | `listProjects` |
| **Pagination** | Cursor-based |

**Query Parameters:**

| Name | Type | Required | Default | Constraints | Description |
|------|------|----------|---------|-------------|-------------|
| `limit` | integer | No | 10 | min: 1, max: 100 | Max items to return |
| `starting_after` | string | No | — | — | Cursor: return items after this cursor |
| `ending_before` | string | No | — | — | Cursor: return items before this cursor |

**Response (200):** `ProjectsListResponse`
```json
{
  "status": "OK",
  "has_more": true,
  "data": [
    {
      "projectId": "string",
      "name": "string",
      "createdAt": "ISO 8601",
      "failFast": "boolean | null",
      "inactivityTimeoutSeconds": "integer | null",
      "defaultBranchName": "string | null",
      "cursor": "string"
    }
  ]
}
```

**Pagination:** Use `has_more` to check for more pages. Use the `cursor` field of the last item as `starting_after` for the next page.

**Error Responses:** 400, 401

---

### 2.2 Get Project

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/projects/{projectId}` |
| **Operation ID** | `getProject` |

**Path Parameters:** `projectId` (string, required)

**Response (200):** `ProjectResponse`
```json
{
  "status": "OK",
  "data": {
    "projectId": "string",
    "name": "string",
    "createdAt": "ISO 8601",
    "failFast": "boolean | null",
    "inactivityTimeoutSeconds": "integer | null",
    "defaultBranchName": "string | null"
  }
}
```

**Error Responses:** 400, 401, 404

---

### 2.3 List Project Runs

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/projects/{projectId}/runs` |
| **Operation ID** | `listProjectRuns` |
| **Pagination** | Cursor-based |

**Path Parameters:** `projectId` (string, required)

**Query Parameters:**

| Name | Type | Required | Default | Constraints | Description |
|------|------|----------|---------|-------------|-------------|
| `limit` | integer | No | 10 | min: 1, max: 100 | Max items to return |
| `starting_after` | string | No | — | — | Cursor for forward pagination |
| `ending_before` | string | No | — | — | Cursor for backward pagination |
| `tags[]` | string[] | No | — | Repeatable | Filter by run tags |
| `branches[]` | string[] | No | — | Repeatable | Filter by git branches |
| `authors[]` | string[] | No | — | Repeatable | Filter by git commit authors |
| `branch` | string | No | — | **Deprecated** | Use `branches[]` instead |
| `tag` | string[] | No | — | **Deprecated** | Use `tags[]` instead |
| `tag_operator` | enum | No | `AND` | `AND` \| `OR` | Logical operator for tag filtering |
| `search` | string | No | — | maxLength: 200 | Search by ciBuildId or commit message |
| `author` | string[] | No | — | **Deprecated** | Use `authors[]` instead |
| `status` | enum[] | No | — | Repeatable | Filter by status: `PASSED`, `FAILED`, `RUNNING`, `FAILING` |
| `completion_state` | enum[] | No | — | Repeatable | Filter by state: `COMPLETE`, `IN_PROGRESS`, `CANCELED`, `TIMEOUT` |
| `date_start` | date-time | No | — | ISO 8601 | Runs created on/after this date |
| `date_end` | date-time | No | — | ISO 8601 | Runs created before this date |

**Response (200):** `RunsListResponse`
```json
{
  "status": "OK",
  "has_more": true,
  "data": [ RunFeedItem, ... ]
}
```

**RunFeedItem** contains: `runId`, `projectId`, `createdAt`, `durationMs`, `tags[]`, `previousRunId`, `cursor`, `timeout`, `cancellation`, `groups[]`, `meta`, `completionState`, `status`

**Error Responses:** 400, 401, 404

---

### 2.4 Get Project Insights

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/projects/{projectId}/insights` |
| **Operation ID** | `getProjectInsights` |

**Path Parameters:** `projectId` (string, required)

**Query Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `date_start` | date-time | **Yes** | — | Start date (ISO 8601) |
| `date_end` | date-time | **Yes** | — | End date (ISO 8601) |
| `resolution` | enum | No | `1d` | Timeline resolution: `1h`, `1d`, `1w` |
| `tags[]` | string[] | No | — | Filter by tags |
| `branches[]` | string[] | No | — | Filter by branches |
| `groups[]` | string[] | No | — | Filter by groups |
| `authors[]` | string[] | No | — | Filter by authors |

**Response (200):** `ProjectInsightsResponse`
```json
{
  "status": "OK",
  "data": {
    "projectId": "string",
    "orgId": "string",
    "dateStart": "ISO 8601",
    "dateEnd": "ISO 8601",
    "resolution": "1h | 1d | 1w",
    "results": {
      "overall": {
        "runs": RunMetrics,
        "tests": TestMetrics
      },
      "timeline": [
        { "<date-bucket>": { "runs": RunMetrics, "tests": TestMetrics } }
      ]
    }
  }
}
```

**RunMetrics:** `total`, `cancelled`, `timeouts`, `completed`, `failed`, `passed`, `nonFullyReported`, `avgDurationSeconds`, `avgSuccessRate`

**TestMetrics:** `total`, `failed`, `passed`, `pending`, `skipped`, `flaky`

**Error Responses:** 400, 401, 404

---

## 3. Runs API

### 3.1 Get Run

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/runs/{runId}` |
| **Operation ID** | `getRun` |

**Path Parameters:** `runId` (string, required)

**Response (200):** `RunResponse`
```json
{
  "status": "OK",
  "data": {
    "runId": "string",
    "projectId": "string",
    "createdAt": "ISO 8601",
    "durationMs": "integer | null",
    "deletedAt": "ISO 8601 | null",
    "tags": ["string"],
    "previousRunId": "string | null",
    "timeout": { "isTimeout": false, "timeoutValueMs": null },
    "cancellation": { "cancelledAt": "...", "cancelledBy": "...", "reason": "..." } | null,
    "groups": [ RunGroup, ... ],
    "meta": {
      "ciBuildId": "string",
      "commit": { "sha", "branch", "authorName", "authorEmail", "message", "remoteOrigin" },
      "framework": { "name", "version" }
    },
    "specs": [ RunSpec, ... ],
    "completionState": "complete | incomplete | cancelled | timedOut",
    "status": "passed | failed | running | cancelled | timedOut"
  }
}
```

**RunGroup:** `groupId`, `platform` (`osName`, `osVersion`, `browserName`, `browserVersion`), `tests` (`overall`, `passes`, `failures`, `pending`, `skipped`, `flaky`)

**RunSpec:** `spec`, `groupId`, `instanceId`, `claimedAt`, `completedAt`, `machineId`, `tags[]`, `inactivityTimeoutMs`, `results` (stats, exception, flaky, videoUrl, screenshots[])

**Error Responses:** 400, 401, 404

---

### 3.2 Delete Run

| Field | Value |
|-------|-------|
| **Method** | `DELETE` |
| **Path** | `/runs/{runId}` |
| **Operation ID** | `deleteRun` |

**Path Parameters:** `runId` (string, required)

**Response (200):** `RunDeleteResponse` — `{ "status": "OK", "data": { "runId": "string" } }`

**Error Responses:** 400, 401, 404

---

### 3.3 Find Run

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/runs/find` |
| **Operation ID** | `findRun` |

Returns the most recent completed run matching the criteria.

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectId` | string | **Yes** | The project ID |
| `ciBuildId` | string | No | Exact CI build ID to match |
| `branch` | string | No | Git branch name (used when ciBuildId not provided) |
| `tags[]` | string[] | No | Filter by tags |
| `tag[]` | string[] | No | **Deprecated** — use `tags[]` |
| `pwLastRun` | boolean | No | If true, include failed test info from last run (Playwright only) |

**Response (200):** `RunResponse` (same schema as Get Run)

**Error Responses:** 400, 401, 404

---

### 3.4 Cancel Run

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **Path** | `/runs/{runId}/cancel` |
| **Operation ID** | `cancelRun` |

**Path Parameters:** `runId` (string, required)

**Response (200):** `RunCancellationResponse`
```json
{
  "status": "OK",
  "data": {
    "runId": "string",
    "cancelled": true,
    "cancelledAt": "ISO 8601"
  }
}
```

**Error Responses:** 400, 401, 404

---

### 3.5 Reset Run

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **Path** | `/runs/{runId}/reset` |
| **Operation ID** | `resetRun` |

**Path Parameters:** `runId` (string, required)

**Request Body (JSON):** `ResetRunRequest`

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `machineId` | string[] | **Yes** | minItems: 1, maxItems: 63 | Machine ID(s) to reset |
| `isBatchedOr8n` | boolean | No | — | Whether to use batched orchestration |

**Response (200):** `ResetRunResponse` — `{ "status": "OK", "data": { ... } }`

**Error Responses:** 400, 401, 404

---

### 3.6 Cancel Run by GitHub CI

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **Path** | `/runs/cancel-ci/github` |
| **Operation ID** | `cancelRunByGithubCI` |

**Request Body (JSON):** `CancelRunGithubCIRequest`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `githubRunId` | string | **Yes** | GitHub Actions workflow run ID |
| `githubRunAttempt` | integer | **Yes** | GitHub Actions workflow run attempt number |
| `projectId` | string | No | Optional project ID to scope the cancellation |
| `ciBuildId` | string | No | Optional CI build ID to scope the cancellation |

**Response (200):** `RunCancellationResponse` (same as Cancel Run)

**Error Responses:** 400, 401, 404

---

## 4. Instances API

### 4.1 Get Instance

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/instances/{instanceId}` |
| **Operation ID** | `getInstance` |

**Path Parameters:** `instanceId` (string, required)

**Response (200):** `InstanceResponse`
```json
{
  "status": "OK",
  "data": {
    "instanceId": "string",
    "runId": "string",
    "groupId": "string",
    "spec": "string (file path)",
    "machineId": "string",
    "claimedAt": "ISO 8601",
    "completedAt": "ISO 8601 | null",
    "results": {
      "stats": {
        "tests": 10, "passes": 8, "failures": 1, "pending": 1, "skipped": 0,
        "suites": 3, "flaky": 0,
        "wallClockStartedAt": "...", "wallClockEndedAt": "...", "wallClockDuration": 5000,
        "startedAt": "...", "endedAt": "...", "duration": 5000
      },
      "exception": "string | null",
      "flaky": 0,
      "videoUrl": "signed URL | null (Cypress only)",
      "screenshots": [ { "screenshotId", "name", "testId", "testAttemptIndex", "takenAt", "screenshotURL" } ],
      "tests": [
        {
          "testId": "string",
          "title": ["describe block", "test name"],
          "state": "passed | failed | pending | skipped",
          "displayError": "string | null",
          "attempts": [
            {
              "attemptId": "string",
              "state": "string",
              "wallClockStartedAt": "...",
              "wallClockDuration": 1200,
              "error": { "message": "...", "stack": "..." } | null
            }
          ]
        }
      ]
    }
  }
}
```

**Error Responses:** 400, 401, 404

---

## 5. Spec Files API

### 5.1 Get Spec Files Performance

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/spec-files/{projectId}` |
| **Operation ID** | `getSpecFiles` |
| **Pagination** | Page-based |

**Path Parameters:** `projectId` (string, required)

**Query Parameters:**

| Name | Type | Required | Default | Constraints | Description |
|------|------|----------|---------|-------------|-------------|
| `date_start` | date-time | **Yes** | — | ISO 8601 | Start date |
| `date_end` | date-time | **Yes** | — | ISO 8601 | End date |
| `page` | integer | No | 0 | min: 0 | Page number (0-indexed) |
| `limit` | integer | No | 50 | min: 1, max: 50 | Items per page |
| `tags[]` | string[] | No | — | Repeatable | Filter by tags |
| `branches[]` | string[] | No | — | Repeatable | Filter by branches |
| `groups[]` | string[] | No | — | Repeatable | Filter by groups |
| `authors[]` | string[] | No | — | Repeatable | Filter by authors |
| `order` | enum | No | `avgDuration` | See below | Sort field |
| `dir` | enum | No | `desc` | `asc` \| `desc` | Sort direction |
| `specNameFilter` | string | No | — | — | Filter by spec file name (partial match) |
| `includeFailedInDuration` | boolean | No | `false` | — | Include failed executions in duration calc |

**`order` enum values:** `avgDuration`, `failedExecutions`, `failureRate`, `flakeRate`, `flakyExecutions`, `fullyReported`, `overallExecutions`, `suiteSize`, `timeoutExecutions`, `timeoutRate`

**Response (200):** `SpecFilesResponse`
```json
{
  "status": "OK",
  "data": {
    "list": [
      {
        "signature": "string",
        "spec": "path/to/spec.ts",
        "metrics": {
          "avgDuration": 5000.0,
          "failedExecutions": 2,
          "failureRate": 0.1,
          "flakeRate": 0.05,
          "flakyExecutions": 1,
          "fullyReported": 18,
          "overallExecutions": 20,
          "suiteSize": 5,
          "timeoutExecutions": 0,
          "timeoutRate": 0.0
        }
      }
    ],
    "total": 150,
    "nextPage": 1 | false
  }
}
```

**Pagination:** `nextPage` is the next page number (integer) or `false` if no more pages.

**Error Responses:** 400, 401, 404

---

## 6. Test Results API

### 6.1 Get Test Results

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/test-results/{signature}` |
| **Operation ID** | `getTestResults` |
| **Pagination** | Cursor-based |

**Path Parameters:** `signature` (string, required) — the unique test signature

**Query Parameters:**

| Name | Type | Required | Default | Constraints | Description |
|------|------|----------|---------|-------------|-------------|
| `date_start` | date-time | **Yes** | — | ISO 8601 | Start date |
| `date_end` | date-time | **Yes** | — | ISO 8601 | End date |
| `limit` | integer | No | 10 | min: 1, max: 100 | Max items to return |
| `starting_after` | string | No | — | — | Cursor for forward pagination |
| `ending_before` | string | No | — | — | Cursor for backward pagination |
| `tags[]` | string[] | No | — | Repeatable | Filter by tags |
| `branches[]` | string[] | No | — | Repeatable | Filter by branches |
| `authors[]` | string[] | No | — | Repeatable | Filter by authors |
| `groups[]` | string[] | No | — | Repeatable | Filter by groups |
| `status[]` | enum[] | No | — | Repeatable | Filter by test status: `passed`, `failed`, `pending`, `skipped` |
| `flaky` | boolean | No | — | — | Filter by flaky status (`true` = only flaky, `false` = only non-flaky) |
| `annotations` | string | No | — | JSON string | Filter by annotations: `[{"type":"owner","description":["John"]}]` |
| `branch[]` | string[] | No | — | **Deprecated** | Use `branches[]` |
| `tag[]` | string[] | No | — | **Deprecated** | Use `tags[]` |
| `git_author[]` | string[] | No | — | **Deprecated** | Use `authors[]` |
| `group[]` | string[] | No | — | **Deprecated** | Use `groups[]` |

**Response (200):** `TestResultsResponse`
```json
{
  "status": "OK",
  "has_more": true,
  "data": [
    {
      "cursor": "string",
      "signature": "string",
      "framework": "string",
      "createdAt": "ISO 8601",
      "projectId": "string",
      "groupId": "string",
      "runId": "string",
      "instanceId": "string",
      "spec": "path/to/spec.ts",
      "machineId": "string",
      "tags": ["string"],
      "title": ["describe", "test name"],
      "testId": "string",
      "displayError": "string | null",
      "commit": { "branch", "authorEmail", "authorName", "sha", "message" },
      "duration": 1500,
      "flaky": false,
      "expectedStatus": "string | null",
      "status": "passed | failed | pending | skipped",
      "attempts": [
        {
          "attemptId": "string",
          "state": "string",
          "error": { "message", "stack", "location" } | null,
          "startedAt": "ISO 8601",
          "duration": 1200
        }
      ],
      "annotations": [{ "type": "string", "description": "string" }] | null
    }
  ]
}
```

**Error Responses:** 400, 401, 404

---

## 7. Tests Explorer API

### 7.1 Get Tests Performance

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/tests/{projectId}` |
| **Operation ID** | `getTestsExplorer` |
| **Pagination** | Page-based |

**Path Parameters:** `projectId` (string, required)

**Query Parameters:**

| Name | Type | Required | Default | Constraints | Description |
|------|------|----------|---------|-------------|-------------|
| `date_start` | date-time | **Yes** | — | ISO 8601 | Start date |
| `date_end` | date-time | **Yes** | — | ISO 8601 | End date |
| `page` | integer | No | 0 | min: 0 | Page number (0-indexed) |
| `limit` | integer | No | 50 | min: 1 | Items per page |
| `tags[]` | string[] | No | — | Repeatable | Filter by tags |
| `branches[]` | string[] | No | — | Repeatable | Filter by branches |
| `groups[]` | string[] | No | — | Repeatable | Filter by groups |
| `authors[]` | string[] | No | — | Repeatable | Filter by authors |
| `order` | enum | No | `title` | See below | Sort field |
| `dir` | enum | No | `desc` | `asc` \| `desc` | Sort direction |
| `spec` | string | No | — | — | Filter by spec file name (partial match) |
| `title` | string | No | — | — | Filter by test title (partial match) |
| `min_executions` | integer | No | — | min: 1 | Minimum number of executions |
| `test_state[]` | enum[] | No | — | Repeatable | Filter by state: `passed`, `failed`, `pending`, `skipped` |
| `metric_settings` | string | No | — | JSON string | Override which statuses are included in metric calculations |

**`order` enum values:** `failures`, `passes`, `flakiness`, `flakinessXSamples`, `failRateXSamples`, `duration`, `durationDelta`, `flakinessRateDelta`, `failureRateDelta`, `durationXSamples`, `executions`, `title`

**`metric_settings` format (JSON string):**
```json
{
  "executions": ["failed", "passed"],
  "avgDuration": ["passed"],
  "flakinessRate": ["passed", "failed"],
  "failureRate": ["failed"]
}
```

**Response (200):** `TestsExplorerResponse`
```json
{
  "status": "OK",
  "data": {
    "list": [
      {
        "title": "string",
        "signature": "string",
        "spec": "path/to/spec.ts",
        "metrics": {
          "executions": 100,
          "failures": 5,
          "ignored": 2,
          "passes": 93,
          "flaky": 3,
          "flakinessRate": 0.03,
          "failureRate": 0.05,
          "avgDurationMs": 1500.0,
          "flakinessVolume": 0.15,
          "failureVolume": 0.25,
          "durationVolume": 150000.0
        },
        "latestTag": ["string"] | null,
        "lastSeen": "ISO 8601 | null"
      }
    ],
    "count": 50,
    "total": 200,
    "nextPage": 1 | false
  }
}
```

**Pagination:** `nextPage` is the next page number or `false` if no more pages. `count` = items in current page, `total` = total matching items.

**Error Responses:** 400, 401, 404

---

## 8. Errors Explorer API

### 8.1 Get Errors Explorer

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/errors/{projectId}` |
| **Operation ID** | `getErrorsExplorer` |
| **Pagination** | Page-based |

**Path Parameters:** `projectId` (string, required)

**Query Parameters:**

| Name | Type | Required | Default | Constraints | Description |
|------|------|----------|---------|-------------|-------------|
| `date_start` | date-time | **Yes** | — | ISO 8601 | Start date |
| `date_end` | date-time | **Yes** | — | ISO 8601 | End date |
| `page` | integer | No | 0 | min: 0 | Page number (0-indexed) |
| `limit` | integer | No | 50 | min: 1, max: 100 | Items per page |
| `tags[]` | string[] | No | — | Repeatable | Filter by tags |
| `tags_logical_operator` | enum | No | `OR` | `OR` \| `AND` | Logical operator for tags filter |
| `branches[]` | string[] | No | — | Repeatable | Filter by branches |
| `groups[]` | string[] | No | — | Repeatable | Filter by groups |
| `authors[]` | string[] | No | — | Repeatable | Filter by authors |
| `error_target` | string | No | — | — | Filter by error target (e.g., CSS selector, URL) |
| `error_message` | string | No | — | — | Filter by error message (case-insensitive partial match) |
| `error_category` | string | No | — | — | Filter by error category |
| `error_action` | string | No | — | — | Filter by error action |
| `order_by` | enum | No | `count` | `count`, `tests`, `branches`, `error` | Sort field |
| `dir` | enum | No | `desc` | `asc` \| `desc` | Sort direction |
| `group_by[]` | enum[] | No | — | Repeatable | Group by dimension: `target`, `action`, `category`, `message` |
| `metric` | enum | No | `occurrence` | `occurrence`, `test`, `branch` | Metric for timeline ranking |
| `top_n` | integer | No | 5 | min: 1, max: 50 | Max top errors per timeline bucket |

**`group_by[]` note:** Order matters — the first value is the primary grouping and filters out nulls for that dimension; subsequent values are applied in order.

**Response (200):** `ErrorsExplorerResponse`
```json
{
  "status": "OK",
  "data": {
    "list": [
      {
        "message": "string | null",
        "error_category": "string | null",
        "error_action": "string | null",
        "error_target": "string | null",
        "count": 42,
        "details": {
          "tests": { "count": 5 },
          "branches": { "count": 3 }
        }
      }
    ],
    "timeline": [
      {
        "date": "string",
        "count": 10,
        "items": [ ErrorsExplorerItem, ... ]
      }
    ],
    "count": 25,
    "total": 150,
    "nextPage": 1 | false
  }
}
```

**Pagination:** `nextPage` is the next page number (0-indexed) or `false` if no more pages.

**Error Responses:** 400, 401, 404

---

## 9. Signature API

### 9.1 Get Test Signature

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/signature/test` |
| **Operation ID** | `getTestSignature` |

**Request Body (JSON):** `TestSignatureRequest`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | **Yes** | The project ID |
| `specFilePath` | string | **Yes** | Full path to the spec file |
| `testTitle` | string \| string[] | **Yes** | Test title or array of titles (for nested describe blocks). If array, minItems: 1 |

**Response (200):** `TestSignatureResponse`
```json
{
  "status": "OK",
  "data": {
    "signature": "abc123def456"
  }
}
```

**Error Responses:** 400, 401, 404

---

## 10. Webhooks API

### 10.1 List Webhooks

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/webhooks` |
| **Operation ID** | `listWebhooks` |

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectId` | string | **Yes** | The project ID |

**Response (200):** `WebhookListResponse`
```json
{
  "status": "OK",
  "data": [ Webhook, ... ]
}
```

No pagination — returns all webhooks for the project.

**Error Responses:** 400, 401, 404

---

### 10.2 Create Webhook

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/webhooks` |
| **Operation ID** | `createWebhook` |

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectId` | string | **Yes** | The project ID |

**Request Body (JSON):** `CreateWebhookRequest`

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `url` | string (URI) | **Yes** | maxLength: 2048 | URL to send webhook POST requests to |
| `headers` | string \| null | No | maxLength: 4096 | Custom headers as JSON string, e.g. `{"Authorization": "Bearer token"}` |
| `hookEvents` | HookEvent[] | No | Default: `[]` | Events that trigger this webhook |
| `label` | string \| null | No | minLength: 1, maxLength: 255 | Human-readable label |

**HookEvent** enum: `RUN_FINISH`, `RUN_START`, `RUN_TIMEOUT`, `RUN_CANCELED`

**Response (201):** `WebhookResponse` — `{ "status": "OK", "data": Webhook }`

**Error Responses:** 400, 401, 404

---

### 10.3 Get Webhook

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/webhooks/{hookId}` |
| **Operation ID** | `getWebhook` |

**Path Parameters:** `hookId` (string, UUID format, required) — globally unique

**Response (200):** `WebhookResponse` — `{ "status": "OK", "data": Webhook }`

**Error Responses:** 400, 401, 404

---

### 10.4 Update Webhook

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **Path** | `/webhooks/{hookId}` |
| **Operation ID** | `updateWebhook` |

**Path Parameters:** `hookId` (string, UUID format, required) — globally unique

**Request Body (JSON):** `UpdateWebhookRequest` — All fields optional (partial update).

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `url` | string (URI) | No | maxLength: 2048 | Webhook URL |
| `headers` | string \| null | No | maxLength: 4096 | Custom headers as JSON string |
| `hookEvents` | HookEvent[] | No | — | Events that trigger the webhook |
| `label` | string \| null | No | minLength: 1, maxLength: 255 | Label |

**Response (200):** `WebhookResponse`

**Error Responses:** 400, 401, 404

---

### 10.5 Delete Webhook

| Field | Value |
|-------|-------|
| **Method** | `DELETE` |
| **Path** | `/webhooks/{hookId}` |
| **Operation ID** | `deleteWebhook` |

**Path Parameters:** `hookId` (string, UUID format, required) — globally unique

**Response (200):** `WebhookDeleteResponse`
```json
{
  "status": "OK",
  "data": {
    "hookId": "UUID string",
    "projectId": "string"
  }
}
```

**Error Responses:** 400, 401, 404

---

### Webhook Response Schema

```json
{
  "hookId": "UUID string",
  "projectId": "string",
  "url": "https://...",
  "headers": "{\"key\":\"value\"}" | null,
  "hookEvents": ["RUN_FINISH", "RUN_START", "RUN_TIMEOUT", "RUN_CANCELED"],
  "label": "string | null",
  "createdAt": "ISO 8601 | null",
  "updatedAt": "ISO 8601 | null"
}
```

---

## 11. Common Schemas

### Shared Filter Parameters (reused across endpoints)

| Parameter | Type | Description |
|-----------|------|-------------|
| `tags[]` | string[] | Filter by run tags (bracket notation, repeatable) |
| `branches[]` | string[] | Filter by git branches (bracket notation, repeatable) |
| `groups[]` | string[] | Filter by run groups (bracket notation, repeatable) |
| `authors[]` | string[] | Filter by git commit authors (bracket notation, repeatable) |

### Deprecated Filter Parameters

| Current | Deprecated Alias | Notes |
|---------|-----------------|-------|
| `tags[]` | `tag[]` | Used in find-run, test-results |
| `branches[]` | `branch[]` | Used in test-results |
| `authors[]` | `git_author[]` | Used in test-results |
| `groups[]` | `group[]` | Used in test-results |
| `branches[]` | `branch` (scalar) | Used in list-project-runs |
| `tags[]` | `tag` (array) | Used in list-project-runs |
| `authors[]` | `author` (array) | Used in list-project-runs |

---

## 12. Pagination Behavior

The API uses **two pagination strategies** depending on the endpoint:

### Cursor-Based Pagination

Used by: `/projects`, `/projects/{projectId}/runs`, `/test-results/{signature}`

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Items per page (default: 10, max: 100) |
| `starting_after` | string | Cursor value — fetch items after this cursor |
| `ending_before` | string | Cursor value — fetch items before this cursor |

**Response fields:**
- `has_more` (boolean): Indicates if more items exist
- Each item includes a `cursor` field for pagination

**Algorithm:**
1. Make initial request (no cursor params)
2. If `has_more` is `true`, take the `cursor` from the last item in `data[]`
3. Pass it as `starting_after` in the next request
4. Repeat until `has_more` is `false`
5. Safety: max 100 iterations (enforced in MCP client)

### Page-Based Pagination

Used by: `/spec-files/{projectId}`, `/tests/{projectId}`, `/errors/{projectId}`

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number, 0-indexed (default: 0) |
| `limit` | integer | Items per page (defaults vary by endpoint) |

**Response fields:**
- `nextPage` (integer \| false): Next page number, or `false` if no more pages
- `total` (integer): Total number of matching items
- `count` (integer): Items in current page (tests/errors only)

**Endpoint-specific limits:**
- Spec Files: default 50, max 50
- Tests Explorer: default 50, no max specified
- Errors Explorer: default 50, max 100

---

## 13. Error Handling

### Error Response Schema

All error responses use a consistent format:

```json
{
  "status": "FAILED",
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Name | Trigger |
|------|------|---------|
| 400 | Bad Request | Invalid parameters, missing required fields, validation failures |
| 401 | Unauthorized | Missing/invalid API key, expired token |
| 404 | Not Found | Resource doesn't exist, project not accessible |

### Success Response Envelope

All successful responses use:
```json
{
  "status": "OK",
  "data": { ... } | [ ... ]
}
```

List endpoints with pagination additionally include `has_more` (cursor-based) or `nextPage`/`total`/`count` (page-based).

### MCP Client Error Handling

The MCP server returns `null` from API calls on HTTP errors and catches network exceptions. Failed requests produce a text response: `"Failed to <action>"` (e.g., "Failed to retrieve actions"). The client logs the HTTP status code and response body for debugging.

---

## Endpoint Summary Table

| # | Method | Path | Pagination | Auth | Tags |
|---|--------|------|------------|------|------|
| 1 | GET | `/actions` | None | Bearer | Actions |
| 2 | POST | `/actions` | None | Bearer | Actions |
| 3 | GET | `/actions/{actionId}` | None | Bearer | Actions |
| 4 | PUT | `/actions/{actionId}` | None | Bearer | Actions |
| 5 | DELETE | `/actions/{actionId}` | None | Bearer | Actions |
| 6 | PUT | `/actions/{actionId}/enable` | None | Bearer | Actions |
| 7 | PUT | `/actions/{actionId}/disable` | None | Bearer | Actions |
| 8 | GET | `/projects` | Cursor | Bearer | Projects |
| 9 | GET | `/projects/{projectId}` | None | Bearer | Projects |
| 10 | GET | `/projects/{projectId}/runs` | Cursor | Bearer | Projects, Runs |
| 11 | GET | `/projects/{projectId}/insights` | None | Bearer | Projects |
| 12 | GET | `/runs/{runId}` | None | Bearer | Runs |
| 13 | DELETE | `/runs/{runId}` | None | Bearer | Runs |
| 14 | GET | `/runs/find` | None | Bearer | Runs |
| 15 | PUT | `/runs/{runId}/cancel` | None | Bearer | Runs |
| 16 | PUT | `/runs/{runId}/reset` | None | Bearer | Runs |
| 17 | PUT | `/runs/cancel-ci/github` | None | Bearer | Runs |
| 18 | GET | `/instances/{instanceId}` | None | Bearer | Instances |
| 19 | GET | `/spec-files/{projectId}` | Page | Bearer | Spec Files |
| 20 | GET | `/test-results/{signature}` | Cursor | Bearer | Test Results |
| 21 | GET | `/tests/{projectId}` | Page | Bearer | Tests Explorer |
| 22 | GET | `/errors/{projectId}` | Page | Bearer | Errors Explorer |
| 23 | POST | `/signature/test` | None | Bearer | Signature |
| 24 | GET | `/webhooks` | None | Bearer | Webhooks |
| 25 | POST | `/webhooks` | None | Bearer | Webhooks |
| 26 | GET | `/webhooks/{hookId}` | None | Bearer | Webhooks |
| 27 | PUT | `/webhooks/{hookId}` | None | Bearer | Webhooks |
| 28 | DELETE | `/webhooks/{hookId}` | None | Bearer | Webhooks |
