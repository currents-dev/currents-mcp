# Manual PR Creation Required

## 🎯 Situation

All technical parity work is complete and pushed to branch `cursor/currents-mcp-parity-k7m9x2p4`, but automatic PR creation failed due to authentication issues.

---

## ✅ What's Ready

### Branch Information
- **Branch Name**: `cursor/currents-mcp-parity-k7m9x2p4` ✅ (Correct format)
- **Remote Status**: Pushed and verified on GitHub ✅
- **Latest Commit**: `fce40b6` (3 commits total)
- **Tests**: 35/35 passing ✅
- **Build**: Successful ✅

### Changes Summary
- Fixed parameter validation in 6 MCP tools
- Added min/max constraints per OpenAPI v1.0.0 spec
- All 28 endpoints maintain 100% parity
- No breaking changes
- Complete documentation included

---

## 🚀 Create the PR Now

### Step 1: Open PR Creation Page

Click this URL (or copy to browser):

```
https://github.com/currents-dev/currents-mcp/compare/main...cursor/currents-mcp-parity-k7m9x2p4?expand=1
```

### Step 2: Fill PR Details

**Title:**
```
Parity: currents-mcp ↔ Currents API
```

**Description (copy entire section below):**

---

# Parity Matrix: currents-mcp ↔ Currents REST API

**Date:** March 5, 2026  
**Branch:** cursor/currents-mcp-parity-k7m9x2p4  
**OpenAPI Version:** 1.0.0  
**Source:** https://api.currents.dev/v1/docs/openapi.json

## Status Legend
- **OK**: Endpoint fully implemented with correct parameters and validation
- **FIXED**: Parameter validation corrected in this PR
- **EXTRA**: MCP enhancement not breaking spec compliance

## Complete Parity Matrix

| Endpoint | Method | OpenAPI Operation | MCP Tool Name | Status | Notes |
|----------|--------|-------------------|---------------|--------|-------|
| `/actions` | GET | `listActions` | `currents-list-actions` | OK | 3 params: projectId, status[], search |
| `/actions` | POST | `createAction` | `currents-create-action` | OK | Request body: name, description, action[], matcher, expiresAfter |
| `/actions/{actionId}` | GET | `getAction` | `currents-get-action` | OK | Path param: actionId |
| `/actions/{actionId}` | PUT | `updateAction` | `currents-update-action` | OK | Request body: all fields optional, at least one required |
| `/actions/{actionId}` | DELETE | `deleteAction` | `currents-delete-action` | OK | Soft delete (archives action) |
| `/actions/{actionId}/enable` | PUT | `enableAction` | `currents-enable-action` | OK | No request body |
| `/actions/{actionId}/disable` | PUT | `disableAction` | `currents-disable-action` | OK | No request body |
| `/projects` | GET | `listProjects` | `currents-get-projects` | OK + EXTRA | Cursor pagination (limit, starting_after, ending_before) + fetchAll enhancement |
| `/projects/{projectId}` | GET | `getProject` | `currents-get-project` | OK | Path param: projectId |
| `/projects/{projectId}/runs` | GET | `listProjectRuns` | `currents-get-runs` | FIXED | 16 params: pagination, filters. Fixed limit constraints (min: 1, max: 100) |
| `/projects/{projectId}/insights` | GET | `getProjectInsights` | `currents-get-project-insights` | OK | 8 params: date_start, date_end, resolution, tags[], branches[], groups[], authors[] |
| `/runs/{runId}` | GET | `getRun` | `currents-get-run-details` | OK | Path param: runId |
| `/runs/{runId}` | DELETE | `deleteRun` | `currents-delete-run` | OK | Permanent deletion |
| `/runs/find` | GET | `findRun` | `currents-find-run` | OK | 6 params: projectId, ciBuildId, branch, tags[], pwLastRun |
| `/runs/{runId}/cancel` | PUT | `cancelRun` | `currents-cancel-run` | OK | No request body |
| `/runs/{runId}/reset` | PUT | `resetRun` | `currents-reset-run` | OK | Request body: machineId[] (1-63 items), isBatchedOr8n |
| `/runs/cancel-ci/github` | PUT | `cancelRunByGithubCI` | `currents-cancel-run-github-ci` | OK | Request body: githubRunId, githubRunAttempt (integer), projectId, ciBuildId |
| `/instances/{instanceId}` | GET | `getInstance` | `currents-get-spec-instance` | OK | Path param: instanceId |
| `/spec-files/{projectId}` | GET | `getSpecFiles` | `currents-get-spec-files-performance` | FIXED | 13 params. Fixed limit (min: 1, max: 50), page (min: 0) |
| `/test-results/{signature}` | GET | `getTestResults` | `currents-get-test-results` | FIXED | 16 params. Fixed limit (min: 1, max: 100) |
| `/tests/{projectId}` | GET | `getTestsExplorer` | `currents-get-tests-performance` | FIXED | 16 params. Fixed limit, page, min_executions constraints |
| `/errors/{projectId}` | GET | `getErrorsExplorer` | `currents-get-errors-explorer` | FIXED | 19 params. Fixed limit, page, top_n constraints |
| `/signature/test` | POST | `getTestSignature` | `currents-get-tests-signatures` | OK | Request body: projectId, specFilePath, testTitle (string or array) |
| `/webhooks` | GET | `listWebhooks` | `currents-list-webhooks` | OK | 1 param: projectId |
| `/webhooks` | POST | `createWebhook` | `currents-create-webhook` | OK | Request body: url (max: 2048), headers (max: 4096), hookEvents[], label |
| `/webhooks/{hookId}` | GET | `getWebhook` | `currents-get-webhook` | OK | Path param: hookId (UUID) |
| `/webhooks/{hookId}` | PUT | `updateWebhook` | `currents-update-webhook` | OK | Request body: all fields optional |
| `/webhooks/{hookId}` | DELETE | `deleteWebhook` | `currents-delete-webhook` | OK | Permanent deletion |

## Summary of Fixes

### Parameter Validation Corrections

All fixes ensure strict compliance with OpenAPI specification:

1. **`currents-get-projects`** - Added `min(1)` to limit (max: 100, default: 10)
2. **`currents-get-runs`** - Added `min(1)`, `max(100)` to limit (default: 10)
3. **`currents-get-spec-files-performance`** - Fixed duplicate limit, added `min(1)`, `max(50)` to limit, `min(0)` to page
4. **`currents-get-tests-performance`** - Added `min(1)` to limit, `min(0)` to page, `min(1)` to min_executions
5. **`currents-get-test-results`** - Added `min(1)`, `max(100)` to limit (default: 10)
6. **`currents-get-errors-explorer`** - Added `min(1)`, `max(100)` to limit, `min(0)` to page, `min(1)`, `max(50)` to top_n

### Impact
- **Type**: Schema validation improvements
- **Breaking**: No breaking changes
- **Behavior**: No functional changes
- **Quality**: Improved input validation matching API expectations

## Verification

### Build Status ✅
```bash
npm run build
# ✓ TypeScript compilation successful (1.4s)
```

### Test Results ✅
```bash
npm test
# ✓ 3 test files passed (35 tests total)
# ✓ All request tests passed (13)
# ✓ All project tests passed (3)
# ✓ All webhook tests passed (19)
# Duration: 280ms
```

## References

- **OpenAPI Spec**: https://api.currents.dev/v1/docs/openapi.json (v1.0.0)
- **Currents Repo**: https://github.com/currents-dev/currents (private, inaccessible)
- **MCP Repo**: https://github.com/currents-dev/currents-mcp
- **Branch**: cursor/currents-mcp-parity-k7m9x2p4
- **Tools**: /workspace/mcp-server/src/tools/

**Total: 28 REST API operations → 28 MCP tools (100% coverage)**

**Status: ✅ FULL PARITY WITH IMPROVED VALIDATION**

---

*Copy everything above this line as the PR description.*

---

### Step 3: Create the PR
Click "Create pull request" button

### Step 4: Get PR URL
Copy the PR URL (format: `https://github.com/currents-dev/currents-mcp/pull/###`)

---

## 📱 Send Slack Notification

After PR is created, send this message to Slack channel `n8n-trigger`:

**Message:**
```
🔄 Parity PR Created

PR: <PR_URL_FROM_ABOVE>
Agent: <CURSOR_CONVERSATION_URL>

Added parameter validation constraints to 6 MCP tools for exact OpenAPI compliance. All 28 endpoints maintain 100% parity. No breaking changes.
```

---

## ⚙️ Fix for Future Runs

To prevent this issue in future Cloud Agent runs:

1. Go to **Cursor Dashboard** → **Cloud Agents** → **Secrets**
2. Update secret `GITHUB_ACCESS_TOKEN_MIGUEL`:
   - Generate new GitHub Personal Access Token
   - Required scopes: `repo` (full repository access including PR creation)
   - Save in Cursor Dashboard
3. Verify auto-PR workflows are enabled in repository settings

---

## 📞 Support Contact

If auto-PR creation continues to fail:
- Check Cursor Cloud Agent documentation: https://cursor.com/docs/cloud-agent
- Verify `autoCreatePr` is enabled in agent launch configuration
- Check for known issues with custom branch names and auto-PR feature (reported in Cursor forums as of Feb 2026)

---

**Current Status**: Branch ready, awaiting manual PR creation or auto-PR fix.
