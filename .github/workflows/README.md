# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Currents MCP Server project.

## Available Workflows

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

**Matrix Strategy:**
The workflow runs tests on multiple Node.js versions to ensure compatibility:

- Node.js 20.x (LTS)
- Node.js 22.x (Latest)

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
