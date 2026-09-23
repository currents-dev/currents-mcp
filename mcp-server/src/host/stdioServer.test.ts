import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMcpServer = vi.hoisted(() =>
  vi.fn(() => ({ connect: vi.fn(async () => {}) }))
);

vi.mock('../server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../server')>()),
  createMcpServer,
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

vi.mock('../lib/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/env')>()),
  CURRENTS_API_KEY: 'env-key',
}));

vi.mock('../lib/logger', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/logger')>()),
  logger: { error: vi.fn(), debug: vi.fn() },
  setLogger: vi.fn(),
}));

const { startMcpServer } = await import('./stdioServer');

/** `startMcpServer` never resolves, so let it reach `connect` and look. */
const started = async (...args: Parameters<typeof startMcpServer>) => {
  void startMcpServer(...args);
  await vi.waitFor(() => expect(createMcpServer).toHaveBeenCalled());
  return createMcpServer.mock.calls[0]?.[0];
};

describe('startMcpServer', () => {
  beforeEach(() => createMcpServer.mockClear());

  // `host/api.ts` re-exports this as the programmatic entry point. An
  // embedder's argv and environment are its own, so nothing in them decides
  // which tools it serves.
  it('builds the server with no request context', async () => {
    const original = process.argv;
    process.argv = ['node', 'app', '--verbose'];
    try {
      await expect(started()).resolves.toBeUndefined();
    } finally {
      process.argv = original;
    }
  });
});
