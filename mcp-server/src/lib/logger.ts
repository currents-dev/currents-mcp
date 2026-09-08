/** The subset of a logger the tool code calls. */
export interface LogSink {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/**
 * Writes to stderr, never stdout: a stdio MCP server speaks its protocol on
 * stdout, so a log line written there corrupts the stream. Used until a host
 * calls `setLogger`, so a host that forgets still has its output somewhere
 * readable rather than dropped.
 */
const consoleSink: LogSink = {
  debug: (message) => console.error(message),
  info: (message) => console.error(message),
  warn: (message) => console.error(message),
  error: (message) => console.error(message),
};

let resolveSink: () => LogSink = () => consoleSink;

/**
 * Points the tool code's logging at the host's logger.
 *
 * This is the seam the two builds of these tools differ at. The standalone
 * `@currents/mcp` package builds a pino writing to stderr, which is what a
 * stdio server needs and what an API process must not do — a second pino
 * inside the API would write its own format outside the request logger.
 *
 * A resolver rather than an instance, because the API's `getLogger()` reads a
 * request-scoped logger out of AsyncLocalStorage: a call made inside a request
 * has to reach that request's logger, not one captured at startup.
 */
export function setLogger(resolve: () => LogSink): void {
  resolveSink = resolve;
}

export const logger = {
  debug: (...args: unknown[]) => resolveSink().debug(format(args)),
  info: (...args: unknown[]) => resolveSink().info(format(args)),
  warn: (...args: unknown[]) => resolveSink().warn(format(args)),
  error: (...args: unknown[]) => resolveSink().error(format(args)),
};

/** Joins the varargs the tool code passes into the single message pino takes. */
function format(args: unknown[]): string {
  return args
    .map((arg) => (typeof arg === 'string' ? arg : safeStringify(arg)))
    .join(' ');
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
