export const CURRENTS_API_URL =
  process.env.CURRENTS_API_URL || "https://api.currents.dev/v1";
export const CURRENTS_API_KEY = (process.env.CURRENTS_API_KEY ?? "").trim();

/** Machine-readable; CLI maps this to a short user message without a stack trace. */
export const MISSING_CURRENTS_API_KEY_MESSAGE =
  "CURRENTS_API_KEY env variable is not set.";
