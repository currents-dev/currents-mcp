import { ORG_FEATURE_KEYS } from '../lib/orgFeatures';
import type { OrgFeatureKey, OrgFeatures } from './scopes';

/**
 * The organization feature flags this server serves tools for.
 *
 * A tool whose `/v1` route sits behind a flag is registered only when the
 * caller's organization has it. The API knows that for itself; a server someone
 * runs on their own machine does not, and the shared gate treats "not told" as
 * "allow" — which is the right default for the API and the wrong one here,
 * where it would advertise tools the account behind the key cannot use and turn
 * every call into a 403 the model has to interpret.
 *
 * So this always answers with a set, and the set is empty unless the launcher
 * names flags. Naming one is a claim about the organization the API key belongs
 * to, not a switch that grants anything: the route still refuses a call the
 * organization is not entitled to.
 */

export const FEATURES_FLAG = '--features';
export const FEATURES_ENV = 'CURRENTS_MCP_FEATURES';

export class UnknownFeatureError extends Error {
  constructor(unknown: string[]) {
    super(
      `Unknown ${unknown.length === 1 ? 'feature' : 'features'}: ` +
        `${unknown.join(', ')}. Known features are ` +
        `${ORG_FEATURE_KEYS.join(', ')}.`
    );
    this.name = 'UnknownFeatureError';
  }
}

/**
 * Reads the flags out of a comma-separated list.
 *
 * Refused rather than ignored, unlike `CURRENTS_MCP_SURFACE`: a mistyped
 * surface costs an analytics bucket, while a mistyped feature costs a tool that
 * the launcher believes it asked for, and an absent tool is not something the
 * model can report back. Failing at startup says so once, where it can be read.
 */
export function parseFeatures(list: string | undefined): OrgFeatures {
  const named = (list ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  const unknown = named.filter(
    (name) => !ORG_FEATURE_KEYS.includes(name as OrgFeatureKey)
  );
  if (unknown.length > 0) {
    throw new UnknownFeatureError(unknown);
  }

  const features: OrgFeatures = {};
  for (const name of named) {
    features[name as OrgFeatureKey] = true;
  }
  return features;
}

/**
 * What the launcher asked for: `--features a,b` if given, `CURRENTS_MCP_FEATURES`
 * otherwise. The flag wins so a client configuration can override an inherited
 * environment.
 */
export function featuresFromLauncher(
  argv: readonly string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env
): OrgFeatures {
  const at = argv.indexOf(FEATURES_FLAG);
  if (at !== -1) {
    return parseFeatures(argv[at + 1]);
  }
  const inline = argv.find((arg) => arg.startsWith(`${FEATURES_FLAG}=`));
  if (inline) {
    return parseFeatures(inline.slice(FEATURES_FLAG.length + 1));
  }
  return parseFeatures(env[FEATURES_ENV]);
}
