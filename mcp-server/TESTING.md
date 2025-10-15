# Testing Guide

This project uses [Vitest](https://vitest.dev/) for unit testing.

## Running Tests

### Run tests in watch mode (default)

```bash
npm test
```

### Run tests once (CI mode)

```bash
npm run test:run
```

### Run tests with UI

```bash
npm run test:ui
```

### Run tests with coverage

```bash
npm run test:coverage
```

## Writing Tests

Test files should be placed alongside the source files they test, using the naming convention:

- `*.test.ts` for TypeScript tests
- `*.spec.ts` for specification tests

### Example Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("MyModule", () => {
  beforeEach(() => {
    // Setup before each test
  });

  it("should do something", () => {
    // Test implementation
    expect(true).toBe(true);
  });
});
```

## Mocking

Vitest provides powerful mocking capabilities:

### Mocking modules

```typescript
vi.mock("./module.js", () => ({
  someFunction: vi.fn(),
}));
```

### Mocking fetch

```typescript
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: "test" }),
});
```

## Configuration

The test configuration is in `vitest.config.ts`. Key settings:

- **Environment**: Node.js
- **Globals**: Enabled (no need to import `describe`, `it`, `expect`)
- **Coverage Provider**: v8
- **Test Pattern**: `**/*.{test,spec}.{ts,tsx}`

## Coverage

Coverage reports are generated in the `coverage/` directory when running `npm run test:coverage`.

Coverage thresholds and exclusions can be configured in `vitest.config.ts`.
