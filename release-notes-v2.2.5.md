### Release Notes

**Version:** 2.2.5
**Release Date:** February 5, 2026
**Previous Version:** 2.2.4
**Repository:** @currents/mcp

### Checklist

- [ ] Notify team about the release
- [ ] Create a ticket to create a public-facing Changelog https://changelog.currents.dev/dashboard/changelog
- [ ] Notify Customers about fixed bugs / features

### Public Changelog Items to Publish

#### Bug Fixes

- **Fixed tests performance tool order parameter enum values** - Updated to use camelCase format (`flakinessXSamples`, `failRateXSamples`, `durationDelta`, etc.) for consistency with OpenAPI specification ([#47](https://github.com/currents-dev/currents-mcp/pull/47))

- **Added missing `durationDelta` enum value** - The tests performance order parameter now includes the previously missing `durationDelta` option ([#47](https://github.com/currents-dev/currents-mcp/pull/47))

- **Fixed `find-run` tool array parameter** - Updated to use proper `tag[]` bracket notation for array parameters, ensuring correct API request formatting ([#47](https://github.com/currents-dev/currents-mcp/pull/47))

#### Documentation

- **Added comprehensive OpenAPI parity analysis documentation** - Detailed analysis of MCP tools alignment with Currents OpenAPI specification ([#49](https://github.com/currents-dev/currents-mcp/pull/49))

#### Dependencies

- **Updated @modelcontextprotocol/sdk** - Bumped from 1.25.2 to 1.26.0 ([#51](https://github.com/currents-dev/currents-mcp/pull/51))

#### Infrastructure

- **Updated authentication for publishing** - Migrated to OIDC for npm package publishing workflow

#### Summary

This patch release focuses on aligning the MCP tools with the Currents OpenAPI specification, fixing parameter naming inconsistencies, and improving documentation. The changes ensure better compatibility and consistency when using the Currents MCP server tools.

**Key Improvements:**
- Better alignment with OpenAPI spec through proper parameter naming
- Fixed array parameter handling in find-run tool
- Enhanced documentation for API parity
- Updated SDK dependency for latest features and fixes
