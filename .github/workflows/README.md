# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Currents MCP Server project.

## Available Workflows

### `release.yaml` - Create Release

Creates a new release with changelog, git tag, and GitHub release.

**Triggers:**

- Manual dispatch only (workflow_dispatch)

**Inputs:**

- `dry_run` (boolean, default: false): Preview the release without making changes

**What it does:**

1. Checks out the code with full git history
2. Sets up Node.js 24.x
3. Installs dependencies
4. Runs the test suite
5. Analyzes commits since last tag to determine version bump:
   - `feat:` commits → minor version bump (e.g., 2.1.3 → 2.2.0)
   - `fix:` commits → patch version bump (e.g., 2.1.3 → 2.1.4)
   - `BREAKING CHANGE:` → major version bump (e.g., 2.1.3 → 3.0.0)
6. Updates CHANGELOG.md with new entries
7. Creates a git commit and tag
8. Creates a GitHub release with auto-generated notes

**Usage:**

1. Go to Actions → "Create Release"
2. Click "Run workflow"
3. Optionally enable "Dry run" to preview changes
4. After release completes, trigger "Publish NPM Package" workflow to publish to npm

---

### `publish.yaml` - Publish NPM Package and Container Image

Publishes the `@currents/mcp` npm package and a public container image to GitHub Container Registry (GHCR) in the same workflow run.

**Triggers:**

- Manual dispatch only (workflow_dispatch)

**Inputs:**

- `channel` (choice): NPM distribution tag — `alpha`, `beta`, `latest`, or `oldversion`

**What it does:**

1. Validates that `latest` channel publishes only from a `release/*` branch or tag
2. Builds and publishes `@currents/mcp` to npm with the selected channel tag
3. On success, builds the root [Dockerfile](../../Dockerfile) and pushes the image to GHCR

**Container image tags** (both applied to the same build):

- `ghcr.io/<org>/currents-mcp:<version>` — immutable semver (e.g. `2.3.3`)
- `ghcr.io/<org>/currents-mcp:<channel>` — moves with the npm dist-tag (`latest`, `beta`, `alpha`, `oldversion`)

**Usage:**

1. Go to Actions → "Publish NPM Package"
2. Select the NPM channel
3. Run workflow from the appropriate branch (e.g. `release/x.y.z` for `latest`)

---

### `sync-from-monorepo.yaml` - Sync MCP source from the monorepo

Pulls the shared MCP source the monorepo publishes and opens a PR with it.

**Triggers:**

- Daily schedule (06:17 UTC)
- Manual dispatch

**Inputs:**

- `dry_run` (boolean, default: true): print the diff without pushing a branch
- `tag` (string, default: `latest`): artifact tag to pull

**What it does:**

1. Pulls `ghcr.io/currents-dev/mcp-source` with `oras`, authenticating with the
   job's own `GITHUB_TOKEN` — this repository is a reader on that package
2. Compares the artifact's monorepo commit against `mcp-server/.synced-from`
   and stops if they match
3. Copies `src/` (except `src/host/`), `skills/` and the logo in, and
   regenerates the README tool table
4. Runs format, types, build and the unit suite over the result
5. Opens a PR from `sync/monorepo-<short-sha>`

`src/host/` is what this copy provides for itself — its entry points, its pino
logger and its build-time assets — and never arrives from the monorepo. The
rest of `src/` is shared, and the monorepo is the side it is edited on.

The monorepo is private and this repository is public, so this one holds no
credential for it: a token cannot be scoped below repo level, so a leak here
would disclose the whole monorepo. The monorepo publishes and this pulls, so
neither side stores a credential for the other — what grants the read is a
reader grant on the `mcp-source` package, revocable in package settings without
touching either repository.

A 403 on the pull means that grant is gone, not that the artifact is missing.

The tag is mutable and the artifact's `manifest.json` reports its own source
commit, so neither establishes where the bytes came from. Write access to that
package is the control. Build provenance would narrow it further, but GitHub's
attestations API is not available to this organization for a private repository
(`Feature not available for the currents-dev organization`), and pinning a
digest defeats a job whose purpose is to pull whatever was published last.

What bounds it is what this job can do with what it pulls: push a branch and
open a PR. It cannot merge or publish, the PR is reviewed by a person, and its
branch prefix is deliberately outside the one `parity-pr-merged.yaml` turns
into a release.

**`test.yml` does not run on that PR.** GitHub starts no `push` or
`pull_request` workflow runs for events caused by `GITHUB_TOKEN` — the parity
workflow's own PRs (#149, #168, #171) show it, none carry a Test job. So this
workflow runs format, types, build and the unit suite itself, before pushing:
a failure means no PR rather than a PR whose green tick is absent for a reason
nobody notices. If cryptographic provenance is
wanted later, `cosign` keyless signing is not plan-gated — at the cost of the
artifact digest appearing in a public transparency log.

**`prettier` is pinned to the exact version the monorepo uses.** Matching
`.prettierrc` is not enough — 3.6 changed how it breaks union types, so a
newer prettier here reformats what the monorepo sent and `npm run format`
fails on a tree nobody edited. Bumping it means bumping both repositories
together, so decline the dependabot bump until the monorepo takes it.

---

### `test.yml` - Unit Tests

Runs the unit test suite on every push and pull request.

**Triggers:**

- Push to any branch
- Pull requests to any branch

**What it does:**

1. Checks out the code
2. Sets up Node.js (tests on both Node 20.x and 22.x)
3. Installs dependencies using `npm ci`
4. Runs the test suite with `npm run test:run`
5. Generates code coverage reports
6. Optionally uploads coverage to Codecov (requires `CODECOV_TOKEN` secret)

**Coverage Reports:**
Coverage reports are generated for all Node versions, but only uploaded from Node 20.x to avoid duplicate reports. Coverage files are located in `mcp-server/coverage/`.

## Secrets

The following secrets can be configured in your repository settings:

- `CODECOV_TOKEN` (optional): Token for uploading coverage reports to Codecov. If not set, the upload step will be skipped without failing the build.

## Local Testing

To run the same tests locally that run in CI:

```bash
cd mcp-server
npm ci
npm run test:run
npm run test:coverage
```

## Troubleshooting

### Tests fail in CI but pass locally

- Ensure you're using the same Node.js version as CI (check the matrix versions)
- Run `npm ci` instead of `npm install` to ensure exact dependency versions
- Check for race conditions or timing issues in tests

### Coverage upload fails

- Verify the `CODECOV_TOKEN` secret is set correctly
- The workflow is configured to not fail if coverage upload fails (`fail_ci_if_error: false`)

### Workflow doesn't trigger

- Ensure the `.github/workflows/` directory is in the root of your repository
- Check that your branch protection rules aren't preventing the workflow from running
- Verify the workflow file has proper YAML syntax

## Adding New Workflows

To add a new workflow:

1. Create a new `.yml` file in this directory
2. Define the workflow name, triggers, and jobs
3. Test it on a feature branch before merging to main
4. Document it in this README

For more information on GitHub Actions syntax, see the [official documentation](https://docs.github.com/en/actions).
