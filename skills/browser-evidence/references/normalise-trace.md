# Normalising a live trace

A trace left in the Playwright MCP's output directory names each screencast
frame by the path it was streamed to, under `screencast/`. A trace archived
into a zip instead carries its frames in `resources/`, named on the event
itself.

The trace API reads frames by that name. A frame it cannot name is dropped, so
an un-normalised trace answers with an empty filmstrip, an empty animation, and a
digest reporting a recording that captured no screenshots.

This step gives every frame a name and puts the bytes where that name points.

## The layout to produce

Zip these at the root of the archive:

```
trace.trace
trace.network
resources/        (frames and page resources)
```

## The script

Run this in the directory holding the recording, before zipping. It must hold
this capture only — see step 1 of the skill.

```python
import json, os, shutil, glob

sources = sorted(glob.glob('trace-*.trace'))
if not sources:
    raise SystemExit('no trace-*.trace here: run this in the directory the recording was written to')
os.makedirs('resources', exist_ok=True)

out, named, missing = [], 0, 0
# Every source is read into one file. A recording with more than one browser
# context writes one trace per context, and the trace API concatenates every
# `.trace` in the archive anyway.
for src in sources:
    for line in open(src, encoding='utf-8'):
        line = line.rstrip('\n')
        if '"screencast-frame"' in line:
            try:
                event = json.loads(line)
            except Exception:
                out.append(line)
                continue
            if event.get('type') == 'screencast-frame' and event.get('file') and not event.get('sha1'):
                name = os.path.basename(event['file'])
                if os.path.exists(event['file']):
                    shutil.copyfile(event['file'], os.path.join('resources', name))
                    # The name the frame is looked up by.
                    event['sha1'] = name
                    named += 1
                else:
                    missing += 1
                line = json.dumps(event)
        out.append(line)

open('trace.trace', 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(f'named {named} frames' + (f', {missing} frame files missing' if missing else ''))
```

Then:

```bash
# The name this capture's trace carries in step 3, so the two do not collide.
NAME=before
cat trace-*.network > trace.network 2>/dev/null || true
# zip adds to an archive that already exists, which would put the first
# capture inside the second one.
rm -f "/tmp/$NAME-trace.zip"
zip -qr "/tmp/$NAME-trace.zip" trace.trace trace.network resources
```

## Checking it worked

`named 0 frames` means the recording captured no screencast, not that the step
failed — a trace of a page that never painted has none. Anything above zero and
the filmstrip will render. A frame whose file is reported missing is dropped
from the filmstrip; a few is normal, all of them means the recording directory
is not the one the frames were streamed to.

The real check is step 5 of the workflow: create the trace link and read the
digest. If it reports frames, this worked.
