# Changelog

# [2.3.0](https://github.com/currents-dev/currents-mcp/compare/v2.2.4...v2.3.0) (2026-05-18)


### Bug Fixes

* add missing annotations param to get-test-results, enforce integer type on githubRunAttempt ([3c5c1ba](https://github.com/currents-dev/currents-mcp/commit/3c5c1ba0d85b3ca3eda8d1579a8a19faf23d4ec2))
* add nullable to webhook headers and label fields to match OpenAPI spec ([1e9223a](https://github.com/currents-dev/currents-mcp/commit/1e9223ab20c6a13aeac002cbf3e5cee76b2231de))
* add nullable() to webhook headers and label to match OpenAPI spec ([4cecfe3](https://github.com/currents-dev/currents-mcp/commit/4cecfe318fdc01c2ce5e38963e53f08fa96722d9))
* align affected-tests tools with OpenAPI spec and add missing endpoint ([#110](https://github.com/currents-dev/currents-mcp/issues/110)) ([287cd65](https://github.com/currents-dev/currents-mcp/commit/287cd652ffa2c60cc4157b935249c242d463504c))
* align list-affected-tests status param with OpenAPI spec ([#106](https://github.com/currents-dev/currents-mcp/issues/106)) ([5fc9716](https://github.com/currents-dev/currents-mcp/commit/5fc9716b064318e6925b594ff53874fca5c3984e))
* align MCP tools with OpenAPI spec ([#47](https://github.com/currents-dev/currents-mcp/issues/47)) ([2820c7c](https://github.com/currents-dev/currents-mcp/commit/2820c7c4db4a24d9f731c1e67d3744a52ddd00f8))
* align Zod validation constraints with OpenAPI spec ([3e31002](https://github.com/currents-dev/currents-mcp/commit/3e310020c9148a2f8c8f9140fd785c149e1f0bee))
* correct PR existence check to handle empty results ([1f435e0](https://github.com/currents-dev/currents-mcp/commit/1f435e07381770cee4eaace067ee16c97d0d98db))
* model name ([326302e](https://github.com/currents-dev/currents-mcp/commit/326302ebe121e6e6dcccc37d35554fb6770c524b))
* use admin merge or auto-merge fallback for release PRs ([1c0e32a](https://github.com/currents-dev/currents-mcp/commit/1c0e32a41ccdd7d6f0a299265358d73835db7fe6))


### Features

* add errors explorer tool ([#63](https://github.com/currents-dev/currents-mcp/issues/63)) ([4bbb123](https://github.com/currents-dev/currents-mcp/commit/4bbb123271f1ab4f515ddee991563ba7def38e0b))
* add listAffectedTests and getAffectedTestExecutions MCP tools ([#98](https://github.com/currents-dev/currents-mcp/issues/98)) ([630006c](https://github.com/currents-dev/currents-mcp/commit/630006c8888c39aedd991ab70ac9dedb0cee5c4f))
* add missing annotations parameter to get-tests-performance tool ([#89](https://github.com/currents-dev/currents-mcp/issues/89)) ([28844ff](https://github.com/currents-dev/currents-mcp/commit/28844ffe112c364618ac25d7c35826ffa1bc3f9d))
* add package.json and package-lock.json for dependency management ([e6fddba](https://github.com/currents-dev/currents-mcp/commit/e6fddba24c76e438fd8e7e831efdfda2e6db148a))
* added cursor cloud agent dependabot analysis workflow ([1ee1522](https://github.com/currents-dev/currents-mcp/commit/1ee15227f33bc0268f1ab1278fb4fa09c3811440))
* **docs:** automate README tools table synchronization and enhance validation tests ([5572e3e](https://github.com/currents-dev/currents-mcp/commit/5572e3e955e6a72548ec801d162f93253496efd3))
* **tests:** add unit tests for MCP tool registration and validation ([42c11a7](https://github.com/currents-dev/currents-mcp/commit/42c11a757d1e15e3763573f768b4f48fa857d16d))
* **tests:** enhance MCP tool validation with combined name length check ([cfb14e1](https://github.com/currents-dev/currents-mcp/commit/cfb14e1c5762ef12be7eb8af140ca79143a2662e))

## Unreleased (2026-04-20)

### Added

* MCP tool `currents-get-context` for `GET /context` (test failure context for AI debugging).

### Fixed

* `currents-list-affected-tests`: serialize `action_type` as repeated `action_type` query keys (OpenAPI `style: form`, `explode: true`).
* `currents-get-runs`: serialize `status` and `completion_state` as repeated query keys (OpenAPI `style: form`, `explode: true`); add optional `pr_id` query param per OpenAPI list runs.
* MCP tools intentionally omit deprecated-only OpenAPI query parameters (for example `tag[]` on find run).
* `currents-update-webhook`: require at least one updatable field so the HTTP request body is never empty (matches OpenAPI `requestBody.required: true`).
* `postApi`: treat HTTP 201 and empty JSON bodies like other successful POST responses.

## [2.2.5](https://github.com/currents-dev/currents-mcp/compare/v2.2.4...v2.2.5) (2026-02-05)

### Bug Fixes

* fix tests performance tool order parameter enum values to use camelCase (`flakinessXSamples`, `failRateXSamples`, `durationDelta`, etc.) ([#47](https://github.com/currents-dev/currents-mcp/pull/47))
* add missing `durationDelta` enum value to tests performance order parameter ([#47](https://github.com/currents-dev/currents-mcp/pull/47))
* fix `find-run` tool to use `tag[]` bracket notation for array parameter ([#47](https://github.com/currents-dev/currents-mcp/pull/47))

### Documentation

* add comprehensive parity analysis documentation ([#47](https://github.com/currents-dev/currents-mcp/pull/47))

## [2.2.4](https://github.com/currents-dev/currents-mcp/compare/v2.2.3...v2.2.4) (2026-01-27)

## [2.2.3](https://github.com/currents-dev/currents-mcp/compare/v2.2.1...v2.2.3) (2026-01-27)

## [2.2.2](https://github.com/currents-dev/currents-mcp/compare/v2.2.1...v2.2.2) (2026-01-27)

## [2.2.1](https://github.com/currents-dev/currents-mcp/compare/v2.2.0...v2.2.1) (2026-01-27)

# [2.2.0](https://github.com/currents-dev/currents-mcp/compare/v2.0.0...v2.2.0) (2026-01-27)


### Bug Fixes

* address PR feedback - add validation, constraints, and handle 204 responses ([9ae2f01](https://github.com/currents-dev/currents-mcp/commit/9ae2f0146712c74a11a84e14e6600dce93ccf95b))
* limit validation rules ([ca6f2d8](https://github.com/currents-dev/currents-mcp/commit/ca6f2d8313fcb4862cf6de837d10589843d98261))
* use the pagination query param, initially set to false the has more variable ([bcb7997](https://github.com/currents-dev/currents-mcp/commit/bcb7997617f7676a37e07acb2171df5207008df8))


### Features

* add full OpenAPI parity with Actions and Runs management APIs ([c479220](https://github.com/currents-dev/currents-mcp/commit/c47922008aa067cda102c12a2b154391f9fa1873))
* api parity for webhooks api, fixes webhooks api ([#37](https://github.com/currents-dev/currents-mcp/issues/37)) ([f646f7c](https://github.com/currents-dev/currents-mcp/commit/f646f7cff4cdc7414c4214d9c87ff8b2ad957d2a)), closes [#38](https://github.com/currents-dev/currents-mcp/issues/38)
* new tool to get list of runs ([9e14e53](https://github.com/currents-dev/currents-mcp/commit/9e14e537d12f3e487f7ff2f29463a82924f370f5))

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
