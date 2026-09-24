---
name: collect-evidence
description: Show that work you implemented actually works, or demo it, from tests that ran in CI via Currents — a trace link whose digest, filmstrip and accessibility snapshots read inside a comment, plus screenshots, attachments and videos. Use when asked to "collect evidence", "prove it works", "show me it works", "demo the feature", "capture a before/after", or to attach proof of a change to a PR, issue, ticket, or status update. Evidence comes from CI runs retrieved through the Currents MCP tools or REST API, not from a local run.
---

# Collect Evidence

Show that a change works, from the artifacts a CI run already produced. The output is a comment on a pull request, ticket or status update: what changed, the evidence for it, and links anyone can open.

Use this when the work is done and someone needs to see it. To fix a test that is failing, use `fix-failing-tests` instead. To prove a change that no test covers, drive the browser yourself — that is `browser-evidence`.

Do not capture evidence locally: CI runs in a clean, reproducible environment, its artifacts are stored and shareable, and this works without a local browser.

| Evidence               | Use for                                           | Where it comes from                         |
| ---------------------- | ------------------------------------------------- | ------------------------------------------- |
| Trace digest           | What the test did and where it broke              | `currents-create-evidence-links` → `digest` |
| Filmstrip / animation  | The whole attempt in one image                    | the same link                               |
| Accessibility snapshot | A before/after diff two screenshots cannot show   | the same link, `snapshots/<t>?format=aria`  |
| Screenshot             | Visual state, before/after UI comparison          | `page.screenshot()` attached to the test    |
| Text/JSON attachment   | CLI output, API responses, computed values, diffs | `testInfo.attach()`                         |
| Video                  | Multi-step flows, interactions                    | Playwright/Cypress video recording          |

## Rules

### Read a run CI already produced; never wait for one

If the run you need has not finished, say what you are waiting for and stop — "the run on this branch is still going; ask me again once CI finishes". Coming back is the person's job.

A lookup by branch returns the most recent **completed** run, so a run still going does not come back as an error: you get the previous run instead. Check the manifest's `commitSha` against the commit you meant. `currents-get-runs` with the branch filter is what shows a run in progress (`RUNNING`, or `FAILING`).

### The failing run is the "before"

Whatever CI recorded while the bug was live is the before; the run on the branch that fixes it is the after. Do not push the broken code again to manufacture one: it spends a CI run on code you have already fixed.

When there is no failing run, say so and lead with the after. The after then carries the claim on its own: the test that would catch the bug, and what it captured.

### A passing run has almost nothing to show

Under the usual `retain-on-failure`, a test that passes leaves no trace and no video, so the after half is screenshots and attachments. Lead the comment with the failing run — the digest, filmstrip and snapshots all come from there.

### Collect both halves in one sitting

Cleanup takes a passing test's artifacts first — seven days after the run on production, sooner if the organization shortened its retention — while a failed test's stay until the bucket lifecycle or an expiry policy reaches them. Come back a week later and the half that is gone is the after.

## Requirements

- The project reports CI test results to Currents (a Currents reporter is configured; runs appear in the dashboard).
- Currents MCP server connected, or `CURRENTS_API_KEY` for REST calls to `https://api.currents.dev/v1`.
- `currents-create-evidence-links` and `currents-get-test-evidence` in your tool list, for steps 2 and 3. Both need the `results:read` scope; without it every evidence tool is missing and there is nothing to fall back to: say that and stop.

## Workflow

### 1. Capture what you want to show, if nothing does yet

A test that already exercises the change needs nothing here. Otherwise write or extend one that captures the artifact at the moment it is visible; [references/instrumentation.md](references/instrumentation.md) has the Playwright and Cypress snippets and the reporter configuration. Then push it and stop — the evidence exists once CI has run.

Rules that make retrieval and pairing work later:

- Name attachments deterministically (`evidence-order-summary.png`, not timestamped names). Before/after pairing matches on test title + attachment name.
- One test per piece of evidence where practical; give the test a distinct, searchable title (e.g. include the word `evidence` or the feature name).
- Keep screenshots deterministic: fixed viewport, disable animations, mask dynamic regions.

### 2. Collect the manifest

1. `currents-get-projects` if the projectId is unknown.
2. `currents-get-test-evidence` with `projectId` + `branch` (or `ciBuildId`, or a known `runId`), plus `spec`/`testTitle`/`testStatus` filters to narrow the output.
3. The result is a manifest: per test its `testId`, under the `instanceId` of the spec it ran in, with signed URLs grouped as `screenshots`, `videos`, `traces`, `attachments`, plus the run's `status`, `commitSha` and `dashboardUrl`.

One call per run, and both runs in the same sitting.

Signed URLs expire. Download as you go:

```bash
curl -sL -o after-order-summary.png "<signed url>"
```

If `currents-get-test-evidence` is unavailable, compose primitives: `currents-find-run` → `currents-get-run-details` (specs → `instanceId`) → `currents-get-spec-instance` (artifact arrays live in `results`), or REST: `GET /runs/find`, `GET /runs/{runId}`, `GET /instances/{instanceId}`.

### 3. Read the trace through a link

Call `currents-create-evidence-links` with the `instanceId` and `testId` from the manifest, and `ttlSeconds` up to seven days when the link goes somewhere people come back to — the default is 24 hours. It serves the highest attempt that has a trace: under `retain-on-failure` that is the failure, but under `trace: 'on'` every attempt has one and the default is the passing retry, so pass the failing attempt's `attempt` from the manifest as `attemptIndex` (it reads `null` for a test that did not retry, so omit it there). A retried test reads as `passed` in the manifest whatever its earlier attempts did, so a second trace on it is the only sign anything failed. A trace uploaded as a named attachment rather than as a Playwright trace is found by that name alone — pass it as `artifactName`. It returns the link and the URLs onto it, none of which need a Currents login:

- `digest` (`?format=md`) first: the actions the test ran, console errors, failed requests, and the screencast frame at each failure. This is what says where it broke, and it is the part you quote in the comment. A test that timed out has no failed action — the digest counts zero — so read the end of the timeline and the console errors instead.
- `filmstrip`: one image of the whole attempt — attach that rather than a video nobody plays. The default nine tiles at 320px are a shape, not something you can read; when the evidence is text on the page, ask for fewer and wider (`?frames=4&width=640`). `animation` is the same thing moving, and renders inline on GitHub and Linear.
- `snapshots/<t>?format=aria`: the page's accessibility tree at that moment. Address it by a `t` from the `snapshots` catalog or from the digest timeline — the catalog names auto-captured snapshots `null`, so a timestamp is what you have. A diff of the before and after trees is what shows the change when both screenshots look identical.
- `requests?status=failed`, and `attachments` for anything the test attached inline.

```bash
curl -sL "<digest url>"
```

Do not download `trace.zip` to put it in a comment — nobody opens one from there.

`attachments/error-context` is Playwright's own failure summary — the accessibility tree at the moment of failure, which the runner computed in the live page rather than from the snapshot. Read it before reconstructing anything yourself. `currents-get-context` for the same test links it too, and the video the trace carries; pass it the same `attempt`, or it answers for the latest one.

### 4. Assemble and present

- Lead with what changed for the user.
- **Before**: the failing run — the digest excerpt that names the failure, the filmstrip, the accessibility snapshot.
- **After**: the passing run — screenshots and attachments, paired with the before by test title + attachment name. For text attachments, download both and show a diff.
- Include each run's `dashboardUrl`. A trace link stops at `expiresAt` and the manifest's signed URLs in about three days; the dashboard link does not expire, so it is the one that has to be there.
- Attach the downloaded files to the comment itself (drag them into the body, or use the tracker's attachment API). Never paste a signed URL.
- Without a trace link: download the `trace.zip` and attach it, noting that it opens at https://trace.playwright.dev. Its manifest URL is signed like every other one, so it is not a link to paste either.
- GIF from a video, when that is the only recording: `ffmpeg -i demo.webm -vf "fps=10,scale=720:-1" demo.gif`.

## Troubleshooting

- **`currents-create-evidence-links` is not in your tools**: the credential is missing `results:read`, and the whole evidence path is gone with it.
- **503 `Trace links are not configured`**: this deployment serves no trace links. Use the fallback in step 4: attach the `trace.zip`.
- **`No trace found for this test attempt`**: the attempt recorded no trace — the ordinary case for a passing test under `retain-on-failure` — or the `instanceId` or `testId` names something else, or the trace was uploaded as an attachment and no `artifactName` was passed to match it. Creating the link never reads the file, so this is not an upload still in flight.
- **`attachments` comes back empty**: the attempt attached nothing inline. Videos and screenshots the reporter uploaded separately are in the evidence manifest, and `currents-get-context` links the failure's own files.
- **The digest fails with a 404 from storage**: the trace bytes are gone. Artifact cleanup took them, which happens to a passing test's artifacts first.
- **No artifacts in the manifest**: the reporter did not capture them. Check Playwright config: `screenshot: "on"`, `video: "retain-on-failure"` (or `"on"` for passing-test demos), `trace: "on"` for the evidence run. `testInfo.attach()` works regardless of these settings.
- **Videos and traces missing for passing tests**: `retain-on-failure` discards them on success. For demo evidence from passing tests, set `"on"` scoped to the evidence spec via a test project — or prefer screenshots and attachments, which are cheap to keep always on.
- **Run not found**: the lookup only returns completed runs, so a run still going reads the same as none. Check `currents-get-runs` for the branch before concluding the reporter never started.
- **Expired URL when downloading**: re-run the evidence tool for fresh signed URLs. An expired trace link is replaced by minting another.
