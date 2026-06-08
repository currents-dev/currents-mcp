#!/usr/bin/env node
import { handleCliMetadataFlags } from "./cli.js";
import { MISSING_CURRENTS_API_KEY_MESSAGE } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { startMcpServer } from "./server.js";

declare const __VERSION__: string;

const cliResult = handleCliMetadataFlags(process.argv, __VERSION__);
if (cliResult.handled) {
  process.exit(cliResult.exitCode);
}

startMcpServer().catch((error) => {
  if (
    error instanceof Error &&
    error.message === MISSING_CURRENTS_API_KEY_MESSAGE
  ) {
    logger.error(
      "CURRENTS_API_KEY is not set. Add your Currents API key to the environment (for example: export CURRENTS_API_KEY=<your-key>)."
    );
  } else {
    logger.error({ err: error }, "Fatal error in main()");
  }
  process.exit(1);
});
