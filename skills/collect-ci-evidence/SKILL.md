---
name: collect-ci-evidence
description: Collect evidence or a demo of an implemented feature from CI test runs via Currents — before/after screenshots, text output stored as test attachments, Playwright videos, traces, and GIFs. Use when asked to "collect evidence", "show proof", "demo the feature", "capture a before/after comparison", or to attach CI test artifacts to a PR, issue, or report. The evidence comes from tests running in CI (retrieved through the Currents MCP tools or REST API), not from local runs.
---

# Collect CI Evidence

Produce verifiable evidence (or a demo) that a feature works by capturing artifacts in CI tests and retrieving them from Currents. Do not capture evidence locally: CI runs in a clean, reproducible environment, artifacts are stored and shareable, and this works even without a local browser.

Evidence types and when to use each:

| Evidence | Use for | Captured by |
| --- | --- | --- |
| Screenshot | Visual state, before/after UI comparison | `page.screenshot()` attached to the test |
| Text/JSON attachment | CLI output, API responses, computed values, diffs | `testInfo.attach()` |
| Video | Multi-step flows, interactions | Playwright/Cypress video recording |
| Trace | Full replay with DOM, network, console | Playwright tracing |
| GIF | Embedding a short demo in a PR/issue | Convert downloaded video with ffmpeg |

## Requirements

- The project reports CI test results to Currents (a Currents reporter is configured; runs appear in the dashboard).
- Currents MCP server connected, or `CURRENTS_API_KEY` for REST calls to `https://api.currents.dev/v1`.

## Workflow

### 1. Instrument a test to capture the evidence

Write or extend a test that exercises the feature and captures the artifact at the decisive moment. See [references/instrumentation.md](references/instrumentation.md) for Playwright and Cypress snippets and reporter configuration.

Rules that make retrieval and pairing work later:

- Name attachments deterministically (`evidence-order-summary.png`, not timestamped names). Before/after pairing matches on test title + attachment name.
- One test per piece of evidence where practical; give the test a distinct, searchable title (e.g. include the word `evidence` or the feature name).
- Keep screenshots deterministic: fixed viewport, disable animations, mask dynamic regions.

### 2. Run in CI

Push the branch (or open a PR) and let CI run with the Currents reporter. Note the branch name; if the workflow sets an explicit `ciBuildId`, note that too.

For a before/after comparison, two runs are needed:

- **before**: run on the base branch (often already exists — the latest `main` run works if the test exists there).
- **after**: run on the feature branch.

If the evidence test is new in the feature branch, it does not exist in the "before" run. In that case capture "before" by running the instrumented test against the base code (e.g. cherry-pick the test onto a throwaway branch off main and push it), or fall back to prose plus the "after" evidence.

Wait for the run to finish before collecting (poll `currents-get-runs` / `currents-find-run` until status is not RUNNING).

### 3. Collect from Currents

Primary tool — `currents-get-test-evidence`:

1. `currents-get-projects` if the projectId is unknown.
2. `currents-get-test-evidence` with `projectId` + `branch` (or `ciBuildId`, or a known `runId`), plus `spec`/`testTitle` filters to narrow the output.
3. The result is a manifest: per test, signed URLs grouped as `screenshots`, `videos`, `traces`, `attachments`, plus the run's `dashboardUrl`.

Signed URLs expire. Download immediately:

```bash
curl -sL -o after-order-summary.png "<signed url>"
```

If `currents-get-test-evidence` is unavailable, compose primitives: `currents-find-run` → `currents-get-run-details` (specs → `instanceId`) → `currents-get-spec-instance` (artifact arrays live in `results`), or REST: `GET /runs/find`, `GET /runs/{runId}`, `GET /instances/{instanceId}`.

### 4. Assemble and present

- **Before/after**: call the evidence tool once per run (base branch and feature branch), pair artifacts by test title + attachment name, present side by side. For text attachments, download both and show a diff.
- **GIF**: download the video, then `ffmpeg -i demo.webm -vf "fps=10,scale=720:-1" demo.gif`.
- **Trace**: link the downloaded `trace.zip` and note it opens at https://trace.playwright.dev.
- Always include the Currents `dashboardUrl` of the run(s) as the durable reference — downloaded URLs expire, the dashboard link does not.
- When embedding in a PR or issue, upload the downloaded files (e.g. drag into the PR body or use the tracker's attachment API); do not paste signed URLs.

## Troubleshooting

- **No artifacts in the manifest**: the reporter did not capture them. Check Playwright config: `screenshot: "on"`, `video: "retain-on-failure"` (or `"on"` for passing-test demos), `trace: "on"` for the evidence run. `testInfo.attach()` works regardless of these settings.
- **Videos/traces missing for passing tests**: `retain-on-failure` discards them on success. For demo evidence from passing tests, temporarily set `"on"` (scoped to the evidence spec via a test project) — or prefer screenshots and attachments, which are cheap to keep always on.
- **Run not found**: the reporter may not have started, or CI is still queued. Verify the branch name and that the CI job actually ran the Currents-wrapped command.
- **Expired URL when downloading**: re-run the evidence tool to get fresh signed URLs.
