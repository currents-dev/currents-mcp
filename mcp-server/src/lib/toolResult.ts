import { ApiFailure } from './request';

/**
 * How much of a response body `describeApiFailure` passes on. A 5xx can return
 * an HTML page, and the whole of one would crowd out the rest of a tool result.
 */
const MAX_BODY_LENGTH = 1000;

/**
 * One line naming the call and what came back, for a tool to hand to its
 * caller. A caller that reads the status and the body can act on it - ask for
 * the scope a 403 names, retry after a 429, correct an id after a 404 - which
 * a single "failed" message left it unable to tell apart.
 */
export function describeApiFailure(failure: ApiFailure): string {
  const call = `${failure.method} ${failure.path}`;
  if (failure.status === null) {
    return `${call}: request failed (${failure.error})`;
  }
  // `error` alongside a status means the response arrived and its body did
  // not, so there is no body to quote and the reason takes its place.
  const detail = failure.error
    ? `body unreadable (${failure.error})`
    : formatBody(failure.body);
  const described = detail
    ? `${call}: HTTP ${failure.status} ${detail}`
    : `${call}: HTTP ${failure.status}`;
  return `${described}${remediation(failure)}`;
}

/**
 * One header can carry several challenges, and RFC 7235 §4.1 separates them
 * with the same comma that separates a challenge's own parameters. Splitting
 * before each scheme name keeps a `scope` with the `error` it was sent
 * alongside: read off the whole header instead, `Bearer error="invalid_token",
 * scope="results:read", Bearer error="insufficient_scope"` would name a scope
 * the refusal never asked for.
 */
const CHALLENGES = /,?\s*(?=Bearer\b)/i;

/** RFC 6750 §3.1: `Bearer error="insufficient_scope", scope="webhooks:write"`. */
const INSUFFICIENT_SCOPE_CHALLENGE = /error="insufficient_scope"/;
const CHALLENGE_SCOPE = /scope="([^"]*)"/;

/** Longer than any scope the API names, so a header carrying something else cannot fill the result. */
const MAX_SCOPE_LENGTH = 100;

/**
 * What to do about the refusal, when the challenge names a scope.
 *
 * The body of an `insufficient_scope` refusal already names the scope in prose,
 * so this is not how the scope reaches the caller - it is the instruction that
 * does not follow from it. The refusal arrives as a tool result rather than as
 * a status on `POST /mcp`, so no OAuth handling in the host will ever see the
 * challenge and re-authorize on its own; an agent told only that it was
 * refused moves on to another tool instead of asking for the one scope.
 *
 * The 401 challenge (`Bearer resource_metadata="..."`) is left unrendered: it
 * names a document for a client that is about to authorize, and the caller
 * here holds a credential the API rejected outright.
 */
function remediation(failure: ApiFailure): string {
  const refusal = failure.challenge
    ?.split(CHALLENGES)
    .find((challenge) => INSUFFICIENT_SCOPE_CHALLENGE.test(challenge));
  const scope = refusal && CHALLENGE_SCOPE.exec(refusal)?.[1];
  if (!scope) {
    return '';
  }
  return ` Ask the user to re-authorize the Currents connection with the ${singleLine(
    scope,
    MAX_SCOPE_LENGTH
  )} scope, then call this tool again.`;
}

/**
 * Control characters, including the ESC that starts an ANSI sequence. An error
 * body quotes what the caller sent - a tag, a URL, a title - and a challenge is
 * a header from whatever host `CURRENTS_API_URL` names, so one carrying a
 * newline would otherwise break the single line this result promises, and one
 * carrying an escape sequence would colour or reposition a terminal reading it.
 * The same rule `lib/logger.ts` applies to its own messages.
 */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;

function formatBody(body: unknown): string {
  if (body === null || body === undefined) {
    return '';
  }
  return singleLine(
    typeof body === 'string' ? body : safeStringify(body),
    MAX_BODY_LENGTH
  );
}

function singleLine(text: string, maxLength: number): string {
  const stripped = text.replace(CONTROL_CHARACTERS, ' ');
  return stripped.length > maxLength
    ? `${stripped.slice(0, maxLength)} [truncated]`
    : stripped;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * The tool result for a Currents API call that came back non-2xx or never
 * reached the API.
 *
 * `summary` says which call failed in the tool's own words; the rest is the
 * status and body, so the caller can tell a missing scope from a wrong id from
 * an outage instead of reading one "Failed to ..." line for all three.
 */
export function apiFailureResult(summary: string, failure: ApiFailure) {
  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: `${summary}: ${describeApiFailure(failure)}`,
      },
    ],
  };
}
