#!/usr/bin/env node
import { MISSING_CURRENTS_API_KEY_MESSAGE } from '../lib/env';
import { logger } from '../lib/logger';
import { FeaturesError, featuresFromLauncher } from './features';
import { startMcpServer } from './stdioServer';

// Inside the async function so a `featuresFromLauncher` that throws
// synchronously still reaches the handler below rather than escaping as an
// uncaught exception with a stack.
async function main(): Promise<void> {
  await startMcpServer({ orgFeatures: featuresFromLauncher() });
}

main().catch((error) => {
  if (error instanceof FeaturesError) {
    // Its own branch, without a stack: the launcher mistyped something and the
    // message names what it should have said, which is the whole of what is
    // useful.
    logger.error(error.message);
  } else if (
    error instanceof Error &&
    error.message === MISSING_CURRENTS_API_KEY_MESSAGE
  ) {
    logger.error(
      'CURRENTS_API_KEY is not set. Add your Currents API key to the environment (for example: export CURRENTS_API_KEY=<your-key>).'
    );
  } else {
    logger.error({ err: error }, 'Fatal error in main()');
  }
  process.exit(1);
});
