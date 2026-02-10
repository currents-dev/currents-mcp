### Release Notes

**Package:** @currents/mcp  
**Version:** 2.2.5  
**Release Date:** February 5, 2026  
**Previous Version:** 2.2.4  
**Comparison:** [v2.2.4...v2.2.5](https://github.com/currents-dev/currents-mcp/compare/v2.2.4...v2.2.5)

#### Bug Fixes

- Fix tests performance tool order parameter enum values to use camelCase (`flakinessXSamples`, `failRateXSamples`, `durationDelta`, etc.) - [#47](https://github.com/currents-dev/currents-mcp/pull/47)
- Add missing `durationDelta` enum value to tests performance order parameter - [#47](https://github.com/currents-dev/currents-mcp/pull/47)
- Fix `find-run` tool to use `tag[]` bracket notation for array parameter - [#47](https://github.com/currents-dev/currents-mcp/pull/47)

#### Documentation

- Add comprehensive parity analysis documentation demonstrating full OpenAPI compliance (30/30 endpoints) - [#47](https://github.com/currents-dev/currents-mcp/pull/47), [#49](https://github.com/currents-dev/currents-mcp/pull/49)

#### Dependencies

- Bump `@modelcontextprotocol/sdk` from 1.25.2 to 1.26.0 in /mcp-server

#### Infrastructure

- Update publishing workflow to use OIDC for authentication

### Checklist

- [ ] Notify team about the release
- [ ] Create a ticket to create a public-facing Changelog https://changelog.currents.dev/dashboard/changelog
- [ ] Notify Customers about fixed bugs / features

### Public Changelog Items to Publish

#### 🐛 Bug Fixes & API Alignment

**MCP Tools Now Fully Aligned with OpenAPI Specification**

This release ensures complete parity between the Currents MCP Server and the official REST API OpenAPI specification:

- **Tests Performance Tool:** Fixed order parameter enum values to use correct camelCase format (`flakinessXSamples`, `failRateXSamples`, `durationDelta`, etc.). Previously, these values were not properly formatted, which could cause sorting issues when querying test performance metrics.

- **Missing Sort Option:** Added the missing `durationDelta` enum value to the tests performance order parameter, allowing you to sort tests by their duration change over time.

- **Find Run Tool:** Fixed the `tag[]` parameter to use proper bracket notation for array parameters, ensuring consistent behavior with other array-based filters across the API.

#### 📚 Documentation

- **Comprehensive Parity Analysis:** Added detailed documentation demonstrating that all 30 REST API endpoints are fully implemented with correct parameters, request bodies, and response handling. This analysis provides transparency about the MCP server's complete API coverage.

#### 🔧 Technical Improvements

- **Updated Dependencies:** Upgraded `@modelcontextprotocol/sdk` to version 1.26.0 for the latest features and improvements.
- **Enhanced Publishing:** Improved CI/CD pipeline with OIDC authentication for more secure package publishing.

#### 🎯 Impact

These fixes ensure that developers using the Currents MCP Server have complete and accurate access to all Currents API functionality, with parameters and behavior matching exactly with the REST API documentation.

---

**Full Changelog:** https://github.com/currents-dev/currents-mcp/compare/v2.2.4...v2.2.5
