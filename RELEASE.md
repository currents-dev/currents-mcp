# Release and Publish Guide

This document describes how to create releases and publish the `@currents/mcp` package to npm.

## Overview

The release process is split into two steps:

1. **Create Release** - Bumps version, updates changelog, creates git tag and GitHub release
2. **Publish to NPM** - Builds and publishes the package to npm

This separation allows for testing releases before publishing and supports multiple npm distribution channels (alpha, beta, latest).

## Prerequisites

- Push access to the repository
- For npm publishing: `NPM_TOKEN` secret configured in GitHub repository settings

## Creating a Release

Releases are created via GitHub Actions or locally using [release-it](https://github.com/release-it/release-it) with conventional commits.

Before starting the release process, create a release branch following the `release/VERSION` convention. For example, if you're releasing version 2.3.0, create a branch named `release/2.3.0`. This branch will automatically trigger the Linear Release workflow.

```bash
git checkout -b release/2.3.0
git push -u origin release/2.3.0
```

### Steps

1. Go to **Actions** → **Create Release**
2. Click **Run workflow**
3. Optionally enable **Dry run** to preview changes without creating an actual release
4. Click **Run workflow**

### What happens

The workflow will:

1. Run the test suite
2. Analyze commits since the last tag to determine the version bump:
   - `feat:` commits → **minor** version bump (e.g., 2.1.0 → 2.2.0)
   - `fix:` commits → **patch** version bump (e.g., 2.1.0 → 2.1.1)
   - `BREAKING CHANGE:` in commit body → **major** version bump (e.g., 2.1.0 → 3.0.0)
3. Update `CHANGELOG.md` with new entries
4. Bump version in `package.json`
5. Create a git commit: `chore: release v<version>`
6. Create a git tag: `v<version>`
7. Create a GitHub release with auto-generated notes

### Requirements

- Must be run from the `main` branch
- Working directory must be clean (no uncommitted changes)

## Publishing to NPM

After creating a release, publish to npm via GitHub Actions.

### Steps

1. Go to **Actions** → **Publish NPM Package**
2. Click **Run workflow**
3. Select the **NPM tag** (distribution channel):
   - `alpha` - Early development versions
   - `beta` - Pre-release versions for testing
   - `latest` - Stable production releases
   - `oldversion` - For publishing older/patched versions
4. Click **Run workflow**

### What happens

The workflow will:

1. Build the TypeScript project
2. Copy `README.md` from the repository root to `mcp-server/`
3. Clean `devDependencies` from `package.json` for a lighter package
4. Run `npm pack --dry-run` to preview the package contents
5. Publish to npm with the selected tag

### Recommended Release Flow

For a typical release:

1. **Create Release** → creates version 2.3.0
2. **Publish to NPM** with tag `beta` → users can install with `npm install @currents/mcp@beta`
3. Test the beta release
4. **Promote beta to latest** (or publish again with `latest` tag)

## Promoting Beta to Latest

To promote a beta release to the `latest` tag without re-publishing:

### Steps

1. Go to **Actions** → **NPM - Promote beta to latest**
2. Click **Run workflow**
3. Enter the **version** to promote (e.g., `2.3.0`)
4. Click **Run workflow**

### What happens

The workflow will:

1. Add the `latest` dist-tag to the specified version
2. Remove the `beta` dist-tag from that version

This is useful when you've tested a beta release and want to make it the default install without rebuilding.

## Linear Release

The repository follows a branch-cut release model with Linear Releases integration:

1. **Main branch** — collects new features and changes
2. **Release branch creation** — when a `release/*` branch is pushed, it automatically:
   - Syncs with Linear Release
3. **Stabilization** — only bug fixes and critical changes are allowed on the release branch
4. **Publishing** — when publishing to npm via the "Publish NPM Package" workflow with `latest` channel, the release is automatically marked as completed in Linear and posted to Slack

The workflow is defined in `.github/workflows/linear-release.yaml` and syncs the release state between Git branches and Linear Releases.

**Required secrets:**

- `LINEAR_ACCESS_KEY` — pipeline-scoped access key (generated from Linear pipeline settings)
- `SLACK_RELEASE_WEBHOOK_URL` — Slack incoming webhook for posting messages

## Local Development

### Dry Run Release Locally

```bash
cd mcp-server
npm run release:dry
```

### Manual Publishing (not recommended)

If you need to publish manually:

```bash
cd mcp-server
npm run publish:mcp -- -- --tag beta
```

Note: This requires `NPM_TOKEN` to be set in your environment and will modify local files.

## Troubleshooting

### Release fails with "working directory not clean"

Commit or stash your changes before running the release workflow.

### Release fails with "not on main branch"

The release workflow must be triggered from the `main` branch. Merge your changes first.

### npm publish fails with authentication error

Verify the `NPM_TOKEN` secret is correctly configured in the repository settings.

### README not showing on npm

The publish script copies `README.md` from the repository root. Ensure the root README exists and is not empty.

## Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/) for automatic version bumping:

```plain
feat: add new tool for fetching test artifacts
fix: handle missing API key gracefully
docs: update setup instructions
chore: update dependencies
refactor: simplify request handling

feat!: redesign API response format
BREAKING CHANGE: response structure has changed
```

| Prefix                         | Version Bump | Example       |
| ------------------------------ | ------------ | ------------- |
| `feat:`                        | Minor        | 2.1.0 → 2.2.0 |
| `fix:`                         | Patch        | 2.1.0 → 2.1.1 |
| `feat!:` or `BREAKING CHANGE:` | Major        | 2.1.0 → 3.0.0 |
| `docs:`, `chore:`, `refactor:` | No bump      | -             |
