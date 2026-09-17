import { ApiRequest, getApiDispatch, getApiKey } from './context';
import { CURRENTS_API_URL } from './env';
import { logger } from './logger';
import { recordApiStatus } from './toolCallReport';
import { getUserAgent } from './userAgent';

/**
 * How long one `/v1` call may take. Without it a connection that stalls after
 * the request is written holds the tool call open for as long as the MCP client
 * waits, which for most clients is longer than a caller will sit through.
 */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Attempts after the first, for a failure a later attempt could get past. */
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;

/**
 * The longest wait a retry may add. A rate limiter can ask for minutes; past
 * this the call is answered with the 429 it got, and the caller — which reads
 * the status off the tool result — decides whether to send it again.
 */
const MAX_RETRY_DELAY_MS = 5_000;

type Method = ApiRequest['method'];

export interface ApiFailure {
  ok: false;
  method: Method;
  /** The API path, including its query string. */
  path: string;
  /** The HTTP status, or null when the request never produced a response. */
  status: number | null;
  /**
   * The parsed JSON body, the raw text when the response was not JSON, or null
   * when it had none.
   */
  body: unknown;
  /**
   * Why the call produced no body to read: the fetch rejection, or the failure
   * of the response stream. Absent when the API answered with one.
   */
  error?: string;
  /**
   * The `WWW-Authenticate` header the refusal carried, verbatim. The REST API
   * sets one naming the scope on `insufficient_scope` (`api/errorHandler.ts`),
   * and that scope is the only part of a refusal a caller can act on without
   * asking a human what to change.
   */
  challenge?: string;
  /**
   * Whether the API received the request, for a call that produced no response
   * to say so.
   *
   * `'no'` when the request never left this process: the host did not resolve,
   * the connection was refused, the route to it was down. `'unknown'` for
   * everything else, including a reset and a timeout — either can land after
   * the request was written and the API acted on it, and calling a reset
   * "not sent" is how a retry of `POST /actions` creates a second action.
   *
   * Absent when the API plainly received it: a status arrived, or a
   * `DispatchTimeout` left a handler running with it.
   */
  received?: 'no' | 'unknown';
}

export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

/**
 * The codes a connection fails with before any of the request is written:
 * name resolution, the connect itself, and the routing failures in between.
 * `fetch` reports them as the `cause` of the TypeError it throws.
 *
 * Nothing after the connect is here. A TLS or protocol failure is left
 * `'unknown'` for the same reason a reset is: the list has to be wrong in the
 * direction that costs a retry rather than a duplicate.
 */
const UNSENT_CODES = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EHOSTDOWN',
  'ENETDOWN',
  'UND_ERR_CONNECT_TIMEOUT',
]);

/** How far down `cause` to look: undici nests one level below fetch's own. */
const MAX_CAUSE_DEPTH = 5;

/** What a thrown `fetch` says about whether the API got the request. */
function receivedByApi(error: unknown): 'no' | 'unknown' {
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (typeof current !== 'object' || current === null) {
      return 'unknown';
    }
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === 'string' && UNSENT_CODES.has(code)) {
      return 'no';
    }
    current = cause;
  }
  return 'unknown';
}

/**
 * Sends one `/v1` request, in this process when the host serves the REST API
 * here and over HTTP otherwise.
 *
 * Both paths answer with a `Response`, so a caller reads the status, the
 * content type and the body the same way whichever served it.
 *
 * The status is recorded here rather than in `request()` because
 * `currents-get-context` calls this directly, and a call that skipped the
 * record would be reported with no status and counted as an upstream error.
 */
export async function callApi(request: ApiRequest): Promise<Response> {
  let response: Response;
  try {
    response = await send(request);
  } catch (error: unknown) {
    recordApiStatus(null);
    throw error;
  }
  recordApiStatus(response.status);
  return response;
}

async function send(request: ApiRequest): Promise<Response> {
  const dispatch = getApiDispatch();
  if (dispatch) {
    // A read gets the same deadline the network path gets. On `POST /mcp` the
    // dispatch is the only branch taken, so without this the bound is the
    // published package's alone and a host stall holds the tool call open for
    // as long as the MCP client waits.
    //
    // A write does not: there is no request to abandon, only a handler that
    // keeps running, so a deadline would tell the caller
    // `currents-cancel-run` failed while the cancel went through. A read has
    // nothing to undo, so abandoning it costs the caller nothing it did not
    // already lose.
    return request.method === 'GET'
      ? withDeadline(request, dispatch(request))
      : dispatch(request);
  }
  return fetch(`${CURRENTS_API_URL}${request.path}`, {
    method: request.method,
    headers: request.headers,
    body: request.body === undefined ? undefined : JSON.stringify(request.body),
    // Covers the body as well as the headers, so a response that starts and
    // then stalls is abandoned too. A fresh signal per call, so each retry
    // gets the whole budget rather than what the first attempt left.
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/**
 * A dispatched read the host did not answer inside `REQUEST_TIMEOUT_MS`.
 *
 * Its own class because `retryDelay` has to tell it from a connection that
 * died. Both arrive as a throw with no status, and both look transient on a
 * read — but the handler behind this one is still running, so sending the
 * request again would put a second one beside it rather than replace it, and
 * one abandoned handler would become three.
 */
export class DispatchTimeout extends Error {
  constructor(method: Method, path: string) {
    super(`timed out after ${REQUEST_TIMEOUT_MS}ms`);
    this.name = 'DispatchTimeout';
    this.method = method;
    this.path = path;
  }
  readonly method: Method;
  readonly path: string;
}

/**
 * Answers the dispatch, or fails the call once the deadline passes.
 *
 * What this frees is the caller, not the process: nothing here can stop the
 * handler, which goes on holding whatever it holds until it finishes on its
 * own. Bounding the work itself is the query timeout in `connection.ts`
 * (ENG-1427), and this logs so that a stall leaves a trace either way — the
 * dispatched request is answered by nothing that writes an access log.
 */
function withDeadline(
  request: ApiRequest,
  pending: Promise<Response>
): Promise<Response> {
  const { method, path } = request;
  return new Promise<Response>((resolve, reject) => {
    const deadline = setTimeout(() => {
      const [pathname] = path.split('?');
      logger.error(
        `Currents API call abandoned: ${method} ${pathname}: no answer in ${REQUEST_TIMEOUT_MS}ms, the handler is still running`
      );
      reject(new DispatchTimeout(method, path));
    }, REQUEST_TIMEOUT_MS);
    pending.then(resolve, reject).finally(() => clearTimeout(deadline));
  });
}

export interface PaginatedResponse<T> {
  status: string;
  has_more: boolean;
  data: T[];
}

/**
 * The headers every `/v1` request carries, whichever helper sends it. `accept`
 * is the caller's: `currents-get-context` asks for markdown.
 */
export function apiHeaders(accept: string): Record<string, string> {
  return {
    'User-Agent': getUserAgent(),
    Accept: accept,
    Authorization: 'Bearer ' + getApiKey(),
  };
}

export function failureFromResponse(
  method: Method,
  path: string,
  response: Response,
  body: unknown
): ApiFailure {
  return {
    ok: false,
    method,
    path,
    status: response.status,
    body,
    ...challengeOf(response),
  };
}

function challengeOf(response: Response): Pick<ApiFailure, 'challenge'> {
  const challenge = response.headers.get('www-authenticate');
  return challenge ? { challenge } : {};
}

export function failureFromError(
  method: Method,
  path: string,
  error: unknown
): ApiFailure {
  return {
    ok: false,
    method,
    path,
    status: null,
    body: null,
    error: describeError(error),
    // An abandoned dispatch is left unclassified: the handler has the request
    // and is still running it, so `'unknown'` would put "call this tool again"
    // on a result whose repeat starts a second handler beside the first.
    ...(error instanceof DispatchTimeout
      ? {}
      : { received: receivedByApi(error) }),
  };
}

/**
 * `AbortSignal.timeout` rejects with "The operation was aborted due to
 * timeout", which does not say how long was waited — and how long is the part
 * a caller deciding whether to narrow its filters and try again needs.
 */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  return error.name === 'TimeoutError'
    ? `timed out after ${REQUEST_TIMEOUT_MS}ms`
    : error.message;
}

/**
 * A response that arrived and a body that did not - a truncated or reset
 * stream. What the response did carry is kept because it is what a caller acts
 * on, where `failureFromError` alone would report no status at all.
 */
export function failureFromBrokenBody(
  method: Method,
  path: string,
  response: Response,
  error: unknown
): ApiFailure {
  return {
    ok: false,
    method,
    path,
    // A response is proof the API received the request, so `received` is left
    // off: what it would say about the broken stream is not the question.
    status: response.status,
    body: null,
    error: describeError(error),
    ...challengeOf(response),
  };
}

/**
 * Logs a failed call without its query string or body: filter values carry
 * commit author addresses, and an error body can quote them back. The tool
 * result is where the full detail goes.
 */
export function logApiFailure(failure: ApiFailure): void {
  const [pathname] = failure.path.split('?');
  const outcome =
    failure.status === null
      ? // A fetch rejection quotes the URL it was given, so this message is cut
        // at the query string for the same reason the path is.
        `${
          failure.received === 'no' ? 'request not sent' : 'request failed'
        } (${failure.error?.split('?')[0]})`
      : `HTTP ${failure.status}`;
  logger.error(
    `Currents API call failed: ${failure.method} ${pathname}: ${outcome}`
  );
}

/**
 * A body as JSON, falling back to the text itself when it is not JSON - an ALB
 * or a proxy in front of the API answers a 502 with HTML.
 *
 * Takes the text rather than the response: the body is read inside
 * `callApiWithRetries`, so that a stream breaking mid-body is a failure it can
 * send again rather than one each caller discovers on its own.
 */
export function parseBody(text: string): unknown {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(
  method: Method,
  path: string,
  body?: unknown
): Promise<ApiResult<T>> {
  const headers = apiHeaders('application/json');
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let read: ApiResponse;
  try {
    read = await callApiWithRetries({ method, path, headers, body });
  } catch (error: unknown) {
    const failure = failureFromError(method, path, error);
    logApiFailure(failure);
    return failure;
  }

  const { response } = read;
  if ('bodyError' in read) {
    const failure = failureFromBrokenBody(
      method,
      path,
      response,
      read.bodyError
    );
    logApiFailure(failure);
    return failure;
  }

  const parsed = parseBody(read.text);
  if (!response.ok) {
    const failure = failureFromResponse(method, path, response, parsed);
    logApiFailure(failure);
    return failure;
  }

  // A 204 or an empty 200 (a cancel, a delete) has no body to hand back.
  return { ok: true, data: (parsed ?? {}) as T };
}

/** A `/v1` call that produced a response, and what its body turned out to be. */
export type ApiResponse =
  | { response: Response; text: string }
  /** The headers arrived and the body did not - a truncated or reset stream. */
  | { response: Response; bodyError: unknown };

/**
 * One `/v1` call, sent again while it fails in a way a later attempt could get
 * past. Answers the response and body that settled it, or throws what the last
 * attempt threw.
 *
 * Below the verb helpers rather than inside them: `currents-get-context` reads
 * a markdown body and so cannot go through `request`, which parses every body
 * as JSON, and a read is the call this is most for.
 *
 * The body is read here rather than by the caller so that a stream breaking
 * after the headers is retriable too. Returning at the headers would leave the
 * commonest transient failure on a large `GET` - a reset mid-body - outside
 * every rule below, because the status the check reads said 200.
 */
export async function callApiWithRetries(
  request: ApiRequest
): Promise<ApiResponse> {
  const { method, path } = request;
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await callApi(request);
    } catch (error: unknown) {
      // An abandoned dispatch is the one throw that is not sent again: see
      // `DispatchTimeout`.
      const delay =
        error instanceof DispatchTimeout
          ? null
          : retryDelay(method, attempt, null, receivedByApi(error));
      if (delay === null) {
        throw error;
      }
      logRetry(method, path, describeError(error), delay);
      await sleep(delay);
      continue;
    }

    const refused = response.ok ? null : retryDelay(method, attempt, response);
    if (refused !== null) {
      // Undici holds the connection until the body is read or cancelled, and
      // this one is never read.
      void response.body?.cancel().catch(() => {});
      logRetry(method, path, `HTTP ${response.status}`, refused);
      await sleep(refused);
      continue;
    }

    try {
      return { response, text: await response.text() };
    } catch (error: unknown) {
      // Weighed as a call that produced no response at all, which is the
      // failure it is: nothing usable arrived, and the status that did cannot
      // say whether sending it again is safe.
      const delay = retryDelay(method, attempt, null);
      if (delay === null) {
        return { response, bodyError: error };
      }
      logRetry(method, path, describeError(error), delay);
      await sleep(delay);
    }
  }
}

/**
 * How long to wait before sending this call again, or null to answer the caller
 * with the failure.
 *
 * A 429 is refused before the API acts on the request, so repeating it is safe
 * whatever the method. A 5xx or a connection that died after the request went
 * out may follow work the API already did, so only a read is sent again — a
 * retried `PUT /runs/:id/cancel` or `create-jira-issue` would otherwise happen
 * twice.
 *
 * A write whose request never left this process is the exception: it changed
 * nothing, so sending it is the first attempt rather than a second.
 */
function retryDelay(
  method: Method,
  attempt: number,
  response: Response | null,
  received: 'no' | 'unknown' = 'unknown'
): number | null {
  if (attempt >= MAX_RETRIES) {
    return null;
  }
  const status = response?.status ?? null;
  const transient =
    status === 429 ||
    (method === 'GET' && (status === null || status >= 500)) ||
    (status === null && received === 'no');
  if (!transient) {
    return null;
  }

  const backoff = RETRY_BASE_DELAY_MS * 2 ** attempt;
  const requested = response && retryAfterMs(response);
  if (requested === null) {
    return backoff;
  }
  // Waiting less than the API asked for spends the attempt on the same refusal.
  return requested > MAX_RETRY_DELAY_MS ? null : Math.max(requested, backoff);
}

/**
 * `Retry-After` as delta-seconds, which is the form the API sends it in
 * (`api/aiShare/rateLimit.ts`). An HTTP-date is left unread and the backoff
 * stands in for it.
 */
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after');
  if (!header) {
    return null;
  }
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

/** Cut at the query string, for the reason `logApiFailure` gives. */
function logRetry(
  method: Method,
  path: string,
  outcome: string,
  delay: number
): void {
  const [pathname] = path.split('?');
  logger.warn(
    `Currents API call failed: ${method} ${pathname}: ${outcome}, retrying in ${delay}ms`
  );
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function fetchApi<T>(path: string): Promise<ApiResult<T>> {
  return request<T>('GET', path);
}

export function postApi<T, B>(path: string, body: B): Promise<ApiResult<T>> {
  return request<T>('POST', path, body);
}

export function putApi<T, B>(path: string, body?: B): Promise<ApiResult<T>> {
  return request<T>('PUT', path, body);
}

export function deleteApi<T>(path: string): Promise<ApiResult<T>> {
  return request<T>('DELETE', path);
}

/**
 * The pages `fetchCursorBasedPaginatedApi` will walk, an upper bound on a loop
 * that would otherwise run for as long as the API kept reporting `has_more`.
 */
const MAX_PAGES = 100;

/**
 * The most items one walk hands back. A page carries up to a hundred records,
 * so `MAX_PAGES` alone allows ten thousand objects serialized into the model's
 * context, crowding out whatever else the caller was working from.
 */
const MAX_ITEMS = 1000;

export interface PaginatedItems<T> {
  items: T[];
  /**
   * Why the walk stopped before the API ran out of pages, for the tool to put
   * in its result. Absent when every page was read: without it a caller cannot
   * tell a list that ended from one that was cut off, and acts on the partial
   * one as if it were whole.
   */
  truncated?: string;
}

export async function fetchCursorBasedPaginatedApi<T>(
  path: string,
  startingAfter?: string
): Promise<ApiResult<PaginatedItems<T>>> {
  const items: T[] = [];
  // What the next page is asked for. Absent on the first page of a walk that
  // starts at the beginning, and set from the caller's own `starting_after`
  // when it is picking up where a capped walk left off.
  let cursor = startingAfter;

  for (let page = 0; ; page++) {
    if (page >= MAX_PAGES) {
      logger.error('Too many iterations, stopping pagination');
      return stoppedShort(
        items,
        `stopped after ${MAX_PAGES} pages and more items remain`
      );
    }

    // `?` or `&` by what `path` already carries. The only caller today passes
    // a bare `/projects`, but a second `?` is a query the API cannot parse the
    // cursor out of, and the walk would then re-read the same page to the cap.
    const fullPath = cursor
      ? `${path}${path.includes('?') ? '&' : '?'}starting_after=${encodeURIComponent(
          cursor
        )}`
      : path;

    const result = await fetchApi<PaginatedResponse<T>>(fullPath);
    if (!result.ok) {
      return result;
    }
    // A page carrying no data array would otherwise throw inside the tool
    // call, where the SDK reports it as a protocol error rather than as the
    // tool failing.
    const thisPage = result.data.data ?? [];
    items.push(...thisPage);
    const hasMore = result.data.has_more;

    // `has_more` is read first: a last page that lands exactly on the cap is a
    // complete list, and marking it partial would send the caller back for
    // items that are not there.
    if (items.length > MAX_ITEMS || (items.length === MAX_ITEMS && hasMore)) {
      items.length = MAX_ITEMS;
      return stoppedShort(
        items,
        `stopped at the ${MAX_ITEMS}-item cap and more items remain`
      );
    }

    if (!hasMore) {
      return { ok: true, data: { items } };
    }

    // Off the page just read, not off everything read so far. An empty page
    // reporting has_more leaves the cumulative array ending on the previous
    // page's last item, so reading from there would ask for that same page
    // again, and again, until the page cap.
    cursor = (thisPage[thisPage.length - 1] as { cursor?: string })?.cursor;
    // A page reporting has_more without a usable cursor would otherwise
    // re-request the previous one until the page cap, or send the string
    // "undefined" as starting_after.
    if (!cursor) {
      logger.error('No cursor to continue pagination from, stopping');
      return {
        ok: true,
        data: {
          items,
          truncated:
            'Incomplete list: the API reported more items but sent no cursor to continue from.',
        },
      };
    }
  }
}

/**
 * The marker for a walk a cap stopped, naming the call that fetches the rest.
 *
 * The same arguments plus the cursor, which is only advice a caller can act on
 * because `startingAfter` above is honoured: a tool that took `fetchAll` and
 * ignored `starting_after` would hand back the same first `MAX_ITEMS` items and
 * the same marker, forever.
 */
function stoppedShort<T>(
  items: T[],
  reason: string
): ApiResult<PaginatedItems<T>> {
  const cursor = (items[items.length - 1] as { cursor?: string })?.cursor;
  // The item the cap landed on carries no cursor, so there is nothing to
  // continue from. Saying so beats trailing off after "more items remain",
  // which reads as an instruction the caller has been left to work out.
  const resume = cursor
    ? ` Call this tool again with the same arguments and starting_after=${cursor} for the rest.`
    : ' The API sent no cursor to continue from, so the rest cannot be fetched.';
  return {
    ok: true,
    data: { items, truncated: `Incomplete list: ${reason}.${resume}` },
  };
}
