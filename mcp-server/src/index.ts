#!/usr/bin/env node
import { startMcpServer } from "./server.js";
import { logger } from "./lib/logger.js";

startMcpServer().catch((error) => {
  logger.error("Fatal error in main():", error);
  process.exit(1);
});
