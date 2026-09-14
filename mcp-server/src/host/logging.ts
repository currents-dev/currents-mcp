import pino from 'pino';
import { setLogger } from '../lib/logger';

/**
 * The tool code logs through whichever sink its host installs. This package's
 * is pino on stderr — stdout is the protocol on a stdio server.
 *
 * Installed as an import side effect rather than from each entry point, so a
 * programmatic embedder that imports `startMcpServer` and never runs a binary
 * gets the same output the binaries do.
 */
export const pinoLogger = pino(
  {
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        destination: 2,
      },
    },
  },
  process.stderr
);

setLogger(() => pinoLogger);
