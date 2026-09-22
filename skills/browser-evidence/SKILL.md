---
name: browser-evidence
description: Prove a change works in a browser you drove yourself, when there is no test to run — reproduce a bug, fix it, and post before/after evidence on a pull request or issue. Use when asked to "reproduce this", "show the bug", "prove the fix", "record a session", "capture before and after", or to demonstrate a change on a ticket that has no automated test. Records the browser as a Currents run and returns links that read without a Currents login. For evidence from tests that already run in CI, use collect-evidence instead.
---

# Browser Evidence

A ticket says something is broken. There is no test that catches it. You drive a browser, record what you see, fix the code, record it again, and post the two side by side.

The recording becomes a Currents run, so the evidence outlives your session and the links work for anyone who opens the pull request.

For a change already covered by a CI test, use `collect-evidence` instead — it reports from a run that CI produced.

## Rules

### Capture the broken behaviour before you touch the code

Once it is fixed you cannot go back and record it. If you have already changed something, stash it and capture first.

### Never start a dev server

A page that does not load tells you nothing: you cannot tell a broken build from a port that is not listening yet. Ask for a URL that is already serving, and stop if there is none.

### Record only what you can publish

The link needs no login, and the trace carries the requests the page made — bodies, headers and cookies. Drive a development account against test data. Never record a real user's session, and stop and ask if the only way in is someone's live account.

### Choose the project before you record

Ask at the start. Asked later, the question arrives with a finished recording in hand, and you will either block on an answer or guess.

## Requirements

- a URL that is already serving the app
- a Currents project id — `currents-get-projects` lists them; ask which one if more than one could be right
- the Currents MCP server connected, with evidence sharing enabled for the organization
- a Playwright MCP server connected, for the browser tools in step 1

## Workflow

### 1. Capture the break

- `browser_start_tracing`
- drive the browser to the broken behaviour — a few steps, not forty
- `browser_take_screenshot`, saved as `before.png`
- `browser_snapshot`, written out to `before-a11y.txt`: the accessibility tree is what makes a before/after diff readable in a comment, where two screenshots often look identical
- `browser_stop_tracing`

Stop tracing without a path. The trace is left in the server's output directory, `.playwright-mcp/traces` unless it was started with `--output-dir`.

Empty that directory before you start, every time. It is reused across captures, and step 2 zips whatever it finds: leave the first recording in place and the second archive carries both, so the fixed run replays the bug and the link serves the earlier session's page resources.

### 2. Zip the trace

From the directory holding the recording, with `screencast/` in the archive — that is where the frames are, and a trace API asked for a filmstrip has nowhere else to read them from. Name the archive after the capture so the two do not overwrite each other.

```bash
NAME=before
cat trace-*.trace   > trace.trace
cat trace-*.network > trace.network 2>/dev/null || true
# zip adds to an archive that already exists, which would put the first
# capture inside the second one.
rm -f "/tmp/$NAME-trace.zip"
zip -qr "/tmp/$NAME-trace.zip" trace.trace trace.network screencast resources
```

### 3. Record the session

Call `currents-create-session` with `projectId`, a `title` saying what you set out to show, `status: "failed"` for the broken capture, the bug text as `error`, and one `artifacts` entry per file:

- the trace zip, `application/zip`, type `trace`
- `before.png`, `image/png`, type `screenshot`
- `before-a11y.txt`, `text/plain`, type `attachment`

One trace per session, and this workflow records two sessions. Name them `before` and `after` as labels; you pick a recording later by the `instanceId` and `testId` this call returns, not by the name.

### 4. Upload

PUT each file to the `uploadUrl` returned for it. They expire about ten minutes after the call, so upload before doing anything else.

Check each one succeeded. `--fail` is what makes curl report a refused upload; without it a 403 from storage is silent, and step 5 mints a link for bytes that never arrived.

```bash
curl --fail -X PUT -H "Content-Type: application/zip" --data-binary @/tmp/before-trace.zip "<uploadUrl>"
```

### 5. Create the trace link and read the digest

Call `currents-create-trace-link` with the `instanceId` and `testId` from step 3. It returns the link and the URLs onto it — `digest`, `filmstrip`, `animation`. Fetch the `digest` URL and read it: it says what the page did and what failed, and it is how you confirm the recording captured the problem. It needs no Currents credential.

```bash
curl -sL "<digest url>"
```

### 6. Fix the code, then do it all again

Make the change. Repeat steps 1 to 5 against the fixed app, naming this trace `after` and recording it with `status: "passed"`.

### 7. Post the comment

Put both halves in one comment:

- the before and after screenshots, attached to the comment itself — drag them into the body, or use the tracker's attachment API. The `readUrl` on the session is a storage URL, not something to paste.
- the diff of the two accessibility snapshots — this is the part that shows what changed when the screenshots look the same
- the digest, filmstrip and animation links for each recording

Lead with what changed for the user.

## Troubleshooting

- **`currents-create-session` is not in your tools**: the organization does not have evidence sharing enabled, or the credential is missing the `runs:write` scope. Both hide it, so say which one you cannot rule out rather than asserting either.
- **403 from the session tool**: the same two causes.
- **404 from the session tool**: the project id does not belong to this organization.
- **422 from the session tool**: recording is suspended for the organization, or its subscription has expired.
- **The upload URL is refused**: more than ten minutes passed since step 3. Record the session again.
- **The digest reports no frames**: the archive has no `screencast/`, or tracing ran without screenshots.
- **`No trace found for this test attempt`**: wrong `instanceId` or `testId`, or an `artifactName` no trace carries. Creating the link never reads the file, so this is not an upload that is still in flight.
- **The digest fails with a 404 from storage**: the trace bytes are not there. Check that step 4 got a 200.
