---
name: browser-evidence
description: Experimental: prove a change works in a browser you drove yourself, when there is no test to run. Use when asked to "reproduce this", "show the bug", "prove the fix", "record a session", "capture before and after", or to demonstrate a change on a ticket that has no automated test. Reproduce a bug, fix it, record each state as a Currents session, and post before/after evidence on a pull request or issue with a link that reads without a Currents login. For evidence from tests that already run in CI, use collect-evidence instead.
---

# Browser Evidence

## Experimental

Its steps, the commands and tools it calls and what they return may change between releases. Tell the user once, when you start, that this skill is experimental, so they do not build a process on its current behaviour.

A ticket says something is broken. There is no test that catches it. You drive a browser, record what you see, fix the code, record it again, and post the two side by side.

Each recording becomes a Currents session, so the evidence outlives your session and the links work for anyone who opens the pull request.

For a change already covered by a CI test, use `collect-evidence` instead — it reports from a run that CI produced.

## Rules

### Capture the broken behaviour before you touch the code

Once it is fixed you cannot go back and record it. If you have already changed something, stash it and capture first.

### Never start a dev server

A page that does not load tells you nothing: you cannot tell a broken build from a port that is not listening yet. Ask for a URL that is already serving, and stop if there is none.

### Record only what you can publish

The share link needs no login, and the trace carries the requests the page made — bodies, headers and cookies. Drive a development account against test data. Never record a real user's session, and stop and ask if the only way in is someone's live account.

### Choose the project before you record

Ask at the start. Asked later, the question arrives with a finished recording in hand, and you will either block on an answer or guess.

## Requirements

- a URL that is already serving the app
- a Currents project id — `currents-get-projects` lists them; ask which one if more than one could be right
- a Playwright MCP server connected, for the browser tools, started with `--caps=devtools`: without it `browser_start_tracing` and `browser_stop_tracing` are missing
- a shell, for the workflow below; without the `currents` command, use [the flow without the currents CLI](#without-the-currents-cli). An agent with no shell at all cannot upload files: it can only report the screenshots and the accessibility diff it has
- the `currents` command from `@currents/cmd`, and a `CURRENTS_API_KEY` with write access in the environment. Install it with `npm install --global @currents/cmd`, or write `npx --package @currents/cmd currents` where the steps say `currents`

## Workflow

Run steps 1 to 4 once per capture: `before` with `--status failed`, `after` with `--status passed`. Share each capture before you start the next one: `session start` replaces the session the later commands use.

### 1. Start the session

```bash
currents session start --project-id <project id> --title "<what you set out to show>" --status failed --error "<the bug, in a sentence>"
```

It prints the session ID and saves the session in `.currents-session/session.json` in the working directory. Add `--pr <url or number>` when the work belongs to a pull request. The commit and branch come from the repository you run it in.

### 2. Capture in the browser

- empty the Playwright MCP trace directory first, `.playwright-mcp/traces` unless the server runs with `--output-dir`. It is reused across captures and `session attach` packs whatever it finds there: the second capture would carry the first
- `browser_start_tracing`
- drive the browser to the behaviour — a few steps, not forty
- `browser_take_screenshot`, saved as `before.png`; use the path the tool reports in the next step
- `browser_snapshot`: the accessibility tree is what makes a before/after diff readable in a comment, where two screenshots often look identical. The tool returns the text; write it to `.currents-session/before-a11y.txt` yourself (`session start` makes `.currents-session/` ignored by git)
- `browser_stop_tracing`, without a path

### 3. Attach the files

```bash
currents session attach <screenshot path> .currents-session/before-a11y.txt .playwright-mcp/traces --caption "before"
```

A folder holding `trace-*.trace` files is packed into one trace; the rest are uploaded as they are. Hidden files, links and subfolders of a folder are left out, and a `.env` file is refused: what you attach is public to anyone with the share link. Delete the screenshot and the trace folder contents when you are done, so they do not end up in a commit. Name the files after the capture (`before`, `after`) so the two do not overwrite each other.

### 4. Share

```bash
currents session share --expires-in-days 7
```

It prints the page link, then a markdown link. Fetch the markdown with `curl -sL "<markdown link>"` and read it: it says what the page did and what failed, and it is how you confirm the recording captured the problem. If it shows nothing wrong in the `before` capture, you recorded the wrong thing: capture again from step 1.

### 5. Fix the code, then do it all again

Make the change. Repeat steps 1 to 4 against the fixed app with `--status passed`, and `after` as the file names.

### 6. Post the comment

Put both halves in one comment:

- the share link of each capture
- the before and after screenshots, attached to the comment itself — drag them into the body, or use the tracker's attachment API
- the diff of the two accessibility snapshots — this is the part that shows what changed when the screenshots look the same

Lead with what changed for the user. Do not post trace links or storage URLs: the share link is the one that stays valid until it expires.

## Troubleshooting

- **`browser_start_tracing` is not in your tools**: the Playwright MCP server was started without `--caps=devtools`. Ask the user to restart it with that flag, or post the screenshots and the accessibility diff without a trace.
- **`session start` answers 401 or 403**: `CURRENTS_API_KEY` is missing or a read key.
- **404 from `session start`**: the project id does not belong to this organization.
- **422 from `session start`**: recording is suspended for the organization, or its subscription has expired.
- **403 from `session share`**: the organization turned public sharing off. Say so, and post the screenshots and the diff without a link.
- **`No session found`**: `session start` did not run in this directory. Run it here, or pass `--session-id`.
- **The markdown reports no frames**: the trace folder had no `screencast/`, or tracing ran without screenshots.
- **The markdown says the network log was not read**: it was over 64 MB. Capture again with fewer steps in a new session.

## Without the currents CLI

Use this when you have a shell and the Currents MCP server but not the `currents` command. An agent with no shell cannot do it: nothing can send the files, so it reports the screenshots and the accessibility diff it has and says no session was recorded.

### Zip the trace

From the directory holding the recording, with `screencast/` in the archive — that is where the frames are, and a trace API asked for a filmstrip has nowhere else to read them from. Name the archive after the capture so the two do not overwrite each other.

```bash
NAME=before
cat trace-*.trace > trace.trace
# A trace.network left from an earlier run would be zipped if the filter
# below failed to write one.
rm -f trace.network
# Keeps every request except scripts that loaded: a dev server serves each
# module as its own request, and against a Vite or Storybook app those alone
# can take the network log past what the trace API reads.
node -e '
const fs = require("fs");
const lines = fs.readdirSync(".")
  .filter((f) => /^trace-.*\.network$/.test(f))
  .sort()
  .flatMap((f) => fs.readFileSync(f, "utf8").split("\n"))
  .filter((line) => {
    if (!line) return false;
    try {
      const event = JSON.parse(line);
      const response = event.snapshot?.response;
      if (event.type !== "resource-snapshot" || !response) return true;
      const loaded = response.status >= 200 && response.status < 400;
      return !(loaded && /javascript|ecmascript/i.test(response.content?.mimeType ?? ""));
    } catch {
      return true;
    }
  });
fs.writeFileSync("trace.network", lines.join("\n"));
'
# zip adds to an archive that already exists, which would put the first
# capture inside the second one.
rm -f "/tmp/$NAME-trace.zip"
zip -qr "/tmp/$NAME-trace.zip" trace.trace trace.network screencast resources
```

Scripts that loaded are not in the link's request count or request list; failed ones are. The trace API reads a network log of up to 64 MB decompressed. A larger one is left out: the digest names it and reports no requests, so failed requests go missing from the evidence.

### Record the session

Call `currents-create-session` with `projectId`, a `title` saying what you set out to show, `status: "failed"` for the broken capture, the bug text as `error`, and one `attachments` entry per file:

- the trace zip, `application/zip`, type `trace`
- `before.png`, `image/png`, type `screenshot`
- `before-a11y.txt`, `text/plain`, type `attachment`

Give each its `sizeBytes` (`wc -c < file`): the upload URL accepts exactly that many bytes. Attachments can be added to the session later with `currents-add-attachments`.

One trace per session, and this workflow records two sessions. You pick a recording later by the `sessionId` this call returns and the `attachmentId` of its trace, not by the name.

### Upload

PUT each file to the `uploadUrl` returned for it, one curl per file, with the headers in that file's `uploadHeaders`. The URL is signed for them: a PNG sent as `application/zip` is refused with a 403. The URLs expire about ten minutes after the call, so upload before doing anything else.

Check each one succeeded. `--fail` is what makes curl report a refused upload; without it a 403 from storage is silent, and the next step mints a link for bytes that never arrived.

```bash
curl --fail -X PUT -H "Content-Type: <uploadHeaders.Content-Type>" --data-binary @<file> "<uploadUrl>"
```

### Create the evidence links and read the digest

Call `currents-create-evidence-links` with the `sessionId` and the trace's `attachmentId` from the session. It returns the link and the URLs onto it — `digest`, `filmstrip`, `animation`. Fetch the `digest` URL and read it: it says what the page did and what failed, and it is how you confirm the recording captured the problem. It needs no Currents credential.

```bash
curl -sL "<digest url>"
```

### Post the comment

Call `currents-create-share-link` with `session_id` and `purpose: "report"` (add `expires_in_days` of 1, 3 or 7) for each recording. It needs the `shares:write` scope, and it returns the link to post, `pageUrl`. Without that scope, post the `digest`, `filmstrip` and `animation` links from the previous step in its place, and say a share link needs the scope.

Then as in step 6 above. Screenshots go into the comment itself; a storage URL from the session is not something to paste.

### Troubleshooting the MCP-only flow

- **`currents-create-session` is not in your tools**: the credential lacks `runs:write`, or is a read API key.
- **403 from the session tool**: the same cause, on a connection that lists every tool (an API key whose access level the server does not know).
- **`currents-create-share-link` is not in your tools**: the credential lacks `shares:write`.
- **503 `Trace links are not configured` from `currents-create-evidence-links`**: this deployment serves no trace links. Attach the trace zip and the screenshots instead, and say the trace opens at https://trace.playwright.dev.
- **404 from the session tool**: the project id does not belong to this organization.
- **422 from the session tool**: recording is suspended for the organization, or its subscription has expired.
- **The upload URL is refused**: more than ten minutes passed since the session was recorded. Record the session again.
- **The digest says `trace.network` was not read**: the network log is over 64 MB even after the filter. Capture again with fewer steps, then zip and record a new session — the trace API caches what it read from the first upload.
- **The digest reports no frames**: the archive has no `screencast/`, or tracing ran without screenshots.
- **`No trace found`**: wrong `sessionId` or `attachmentId`, or an `artifactName` no trace carries. Creating the link never reads the file, so this is not an upload that is still in flight.
- **The digest fails with a 404 from storage**: the trace bytes are not there. Check that the upload got a 200.
