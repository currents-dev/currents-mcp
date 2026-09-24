---
name: fix-failing-tests
description: Fix tests that failed in CI, using the results Currents recorded — errors, steps, traces, screenshots and console output. Use when CI is red, a pull request check failed, a build broke, someone asks why a test failed, or you are given a Currents run or test link. Works from a developer's machine or from a CI job that runs after the tests failed.
---

# Fix Failing Tests

Fix the tests that failed in a CI run, from what Currents recorded while they ran. The output is a code change and a short report: per test, the cause, the change and how you checked it.

The tests already ran in CI. Do not run the whole suite to find out what failed: the CI run is the record, and it has the traces, screenshots and console output a local run may not reproduce.

To show that a change works rather than fix a failure, use `collect-evidence`.

## Rules

### Say which run you are fixing

Before changing anything, name the run: branch, commit, when it ran, and how many tests failed. A run for the wrong commit is the most common way to fix the wrong thing, and the person reading this is the one who notices.

When you work in a checkout, compare the run's commit with `HEAD`. If they differ, say so; the failure may already be fixed, or the code may have moved.

### Fix the cause, not the symptom

Do not add retries, raise timeouts, or skip or quarantine a test to make it pass, unless the person asked for that. If the cause is outside the code — a test environment, a third-party service, data — say so instead of changing the test.

### Flaky tests are yours to judge

A test marked `flaky` failed an attempt and passed on a retry. Read its failed attempt like any other failure, then decide whether it is worth fixing now, and say what you decided and why. A flaky test usually points at a race, shared state or an order dependency; name which one when you can.

### Do not commit or push without asking

Leave the change in the working tree unless the person asked you to commit, push or open a pull request.

## Requirements

- The project reports CI test results to Currents.
- Currents MCP server connected, or `CURRENTS_API_KEY` for REST calls to `https://api.currents.dev/v1`.
- `currents-get-context` in your tool list. It needs the `results:read` scope; without it there is nothing to read the failures from: say that and stop.

## Workflow

### 1. Find the run

Use the most exact thing you have, in this order:

1. **A Currents link.** `https://app.currents.dev/run/<runId>` gives the run. `https://app.currents.dev/i/<instanceId>/test/<testId>` gives one test.
2. **A CI build ID** — in CI, the value the test job passed to the Currents reporter. `currents-find-run` with `ciBuildId` and `projectId` is an exact match.
3. **A pull request.** `currents-list-pull-requests` with the PR number, then its latest run.
4. **The branch.** `currents-find-run` with `branch` returns the most recent completed run, which can be for an older commit than the one you are on.

`currents-get-projects` gives the `projectId` when you do not have it.

If the run is still going (`currents-get-runs` shows it `RUNNING` or `FAILING`), stop and say so. Fixing half a run means fixing again when the rest fails.

### 2. Read the failures

Call `currents-get-context` with `format: "md"`:

- For a run: `run_id`, plus `include_flaky: true` to see the flaky tests too. It lists the failed tests with their errors and groups tests that failed the same way; page with `limit` and `page`.
- For one test: `instance_id` and `test_id`. This is where the detail is: the steps before the failure, the error with its source location, and links to the trace, screenshots, video and error context.

Read the run first to see what failed and which failures share a cause, then one test at a time for the ones you fix. Tests that failed with the same error usually have one fix.

Open the linked files when the error alone does not say enough. The error context is the page's accessibility tree at the moment of failure; the trace is what the test did.

### 3. Fix

Change the code or the test, whichever is wrong. Keep the change to what the failure needs.

### 4. Check the fix

Run only the tests you fixed, locally, when the repository allows it — for example `npx playwright test <spec> -g "<test title>"`. Do not report the local run to Currents.

When the tests cannot run here (in CI without the app, or with services you do not have), say that the next CI run is the check. Once it passes, `collect-evidence` can show the fix on the pull request.

### 5. Report

Per test: what failed, the cause, the change, and how you checked it. List any test you left alone and why — flaky tests you judged not worth fixing now, or failures whose cause is outside the code.

### Handing the failures to someone else

When asked to hand the failures to a reviewer, a teammate or another agent without Currents access, create a link with `currents-create-share-link` and `purpose: "fix"`. It is public until it expires — one day by default — so create one only when asked. Needs the `shares:write` scope.

## Running in CI

A CI job that runs after the test job failed can use this skill unattended. Give it the same CI build ID and project ID the test job gave the Currents reporter, and say what to do with the result, for example: open a pull request with the fix and comment on the original pull request. Authenticate with a `CURRENTS_API_KEY`.

## Troubleshooting

- **`currents-get-context` is not in your tools**: the credential is missing `results:read`.
- **No run found**: the lookup returns completed runs only, so a run still going reads the same as none. Check `currents-get-runs` for the branch.
- **The run passed but CI is red**: the failure is outside the tests Currents recorded — a build step, a lint job, a test job without the reporter. Read the CI log instead.
- **The failure does not reproduce locally**: compare the environment the run recorded (browser, OS, framework version in the context) with yours, and read the trace for timing the local run does not have.
