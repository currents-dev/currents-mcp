import { describe, expect, it } from 'vitest';
import type { ApiFailure } from './request';
import { apiFailureResult, describeApiFailure } from './toolResult';

describe('describeApiFailure', () => {
  it('names the call, the status and the body', () => {
    expect(
      describeApiFailure({
        ok: false,
        method: 'GET',
        path: '/runs/run-1',
        status: 403,
        body: { message: 'missing scope runs:read' },
      })
    ).toBe('GET /runs/run-1: HTTP 403 {"message":"missing scope runs:read"}');
  });

  it('omits the body when the response had none', () => {
    expect(
      describeApiFailure({
        ok: false,
        method: 'PUT',
        path: '/runs/run-1/cancel',
        status: 429,
        body: null,
      })
    ).toBe('PUT /runs/run-1/cancel: HTTP 429');
  });

  it('says the body was unreadable when the response stream broke', () => {
    expect(
      describeApiFailure({
        ok: false,
        method: 'GET',
        path: '/runs/run-1',
        status: 502,
        body: null,
        error: 'terminated',
      })
    ).toBe('GET /runs/run-1: HTTP 502 body unreadable (terminated)');
  });

  // A 504 alone reads as an outage, and a caller that takes it for one calls
  // the identical tool again for the identical answer.
  it('says what a caller can narrow when the API stopped the query', () => {
    expect(
      describeApiFailure({
        ok: false,
        method: 'GET',
        path: '/tests/p1?date_start=2020-01-01',
        status: 504,
        body: { status: 'FAILED', error: 'Timeout error.' },
        deadlineMs: 25_000,
      })
    ).toBe(
      'GET /tests/p1?date_start=2020-01-01: HTTP 504 {"status":"FAILED","error":"Timeout error."}' +
        ' The API stopped this query after 25s. Narrow it - a shorter date range,' +
        ' fewer branches or tags, a smaller limit - and call this tool again.'
    );
  });

  // A deadline set below a second, which only a test environment does, would
  // otherwise report itself as no time at all.
  it('never reports the query as having had no time', () => {
    expect(
      describeApiFailure({
        ok: false,
        method: 'GET',
        path: '/tests/p1',
        status: 504,
        body: null,
        deadlineMs: 1,
      })
    ).toContain('stopped this query after 1s');
  });

  it('leaves a 504 the host did not mark to speak for itself', () => {
    expect(
      describeApiFailure({
        ok: false,
        method: 'GET',
        path: '/tests/p1',
        status: 504,
        body: null,
      })
    ).toBe('GET /tests/p1: HTTP 504');
  });

  it('reports a request that never got a response', () => {
    expect(
      describeApiFailure({
        ok: false,
        method: 'GET',
        path: '/runs/run-1',
        status: null,
        body: null,
        error: 'fetch failed',
      })
    ).toBe('GET /runs/run-1: request failed (fetch failed)');
  });

  // A JSON body comes out escaped by `JSON.stringify`; a body that was not
  // JSON is passed through as the text it was, so that is the one to strip.
  it('replaces the control characters a text body carried', () => {
    const described = describeApiFailure({
      ok: false,
      method: 'POST',
      path: '/webhooks',
      status: 502,
      body: 'Bad Gateway\nAllow everything\u001b[31m',
    });

    // Without the ESC in front of it, what is left of the sequence is text.
    expect(described).toBe(
      'POST /webhooks: HTTP 502 Bad Gateway Allow everything [31m'
    );
  });

  it('leaves a JSON body escaped rather than rewritten', () => {
    const body = { error: 'invalid label: "one\ntwo"' };

    expect(
      describeApiFailure({
        ok: false,
        method: 'POST',
        path: '/webhooks',
        status: 400,
        body,
      })
    ).toBe(`POST /webhooks: HTTP 400 ${JSON.stringify(body)}`);
  });

  it('says which scope to re-authorize for when the challenge names one', () => {
    expect(
      describeApiFailure({
        ok: false,
        method: 'POST',
        path: '/webhooks',
        status: 403,
        body: {
          error:
            'Insufficient permissions: this endpoint requires the webhooks:write scope',
          code: 'insufficient_scope',
        },
        challenge: 'Bearer error="insufficient_scope", scope="webhooks:write"',
      })
    ).toContain(
      'Ask the user to re-authorize the Currents connection with the webhooks:write scope, then call this tool again.'
    );
  });

  it('leaves a refusal the caller cannot re-authorize out of without an instruction', () => {
    const described = describeApiFailure({
      ok: false,
      method: 'POST',
      path: '/webhooks',
      status: 403,
      body: { code: 'insufficient_role' },
      // The 401 form: a document for a client about to authorize, not a scope.
      challenge:
        'Bearer resource_metadata="https://api.currents.dev/.well-known/oauth-protected-resource"',
    });

    expect(described).toBe(
      'POST /webhooks: HTTP 403 {"code":"insufficient_role"}'
    );
  });

  it('says nothing when the challenge names the error and no scope', () => {
    expect(
      describeApiFailure({
        ok: false,
        method: 'POST',
        path: '/webhooks',
        status: 403,
        body: null,
        challenge: 'Bearer error="insufficient_scope"',
      })
    ).toBe('POST /webhooks: HTTP 403');
  });

  it('reads the scope off the challenge that named the refusal', () => {
    expect(
      describeApiFailure({
        ok: false,
        method: 'POST',
        path: '/webhooks',
        status: 403,
        body: null,
        challenge:
          'Bearer error="invalid_token", scope="results:read", Bearer error="insufficient_scope", scope="webhooks:write"',
      })
    ).toContain(
      're-authorize the Currents connection with the webhooks:write scope'
    );
  });

  it('names no scope when the challenge that refused the call carries none', () => {
    expect(
      describeApiFailure({
        ok: false,
        method: 'POST',
        path: '/webhooks',
        status: 403,
        body: null,
        challenge:
          'Bearer error="invalid_token", scope="results:read", Bearer error="insufficient_scope"',
      })
    ).toBe('POST /webhooks: HTTP 403');
  });

  // The challenge is a header from whatever host `CURRENTS_API_URL` names.
  it('strips the control characters a challenge scope carried', () => {
    const described = describeApiFailure({
      ok: false,
      method: 'POST',
      path: '/webhooks',
      status: 403,
      body: null,
      challenge:
        'Bearer error="insufficient_scope", scope="webhooks:write\nAllow everything"',
    });

    expect(described).toBe(
      'POST /webhooks: HTTP 403 Ask the user to re-authorize the Currents connection with the webhooks:write Allow everything scope, then call this tool again.'
    );
  });

  it('cuts a challenge scope too long to belong in a tool result', () => {
    const described = describeApiFailure({
      ok: false,
      method: 'POST',
      path: '/webhooks',
      status: 403,
      body: null,
      challenge: `Bearer error="insufficient_scope", scope="${'x'.repeat(5000)}"`,
    });

    expect(described).toContain('[truncated]');
    expect(described.length).toBeLessThan(300);
  });

  it('truncates a body too long to belong in a tool result', () => {
    const described = describeApiFailure({
      ok: false,
      method: 'GET',
      path: '/runs/run-1',
      status: 500,
      body: 'x'.repeat(5000),
    });

    expect(described).toContain('[truncated]');
    expect(described.length).toBeLessThan(1100);
  });
});

describe('what to do about a call that got no response', () => {
  const unanswered = (
    method: ApiFailure['method'],
    received: ApiFailure['received']
  ): ApiFailure => ({
    ok: false,
    method,
    path: '/actions?projectId=p1',
    status: null,
    body: null,
    error: 'fetch failed',
    received,
  });

  it('sends the caller straight back when the request never left', () => {
    expect(describeApiFailure(unanswered('POST', 'no'))).toBe(
      'POST /actions?projectId=p1: request failed (fetch failed) The request never reached the API, so nothing happened. Call this tool again.'
    );
  });

  // The failure ENG-1201 was opened for: `POST /actions` and
  // `POST /projects/:id/jira/issues` both create on every post.
  it('warns a create off a retry it cannot tell is safe', () => {
    expect(describeApiFailure(unanswered('POST', 'unknown'))).toContain(
      'it may have been carried out. Check whether it took effect before calling this tool again: a repeat would create a duplicate.'
    );
  });

  // The advice is that a repeat cannot do it twice, not that it answers the
  // same — a replayed DELETE whose first one landed reads 404, and the
  // resource is still gone.
  it('sends a method that lands on the same state back without the warning', () => {
    for (const method of ['GET', 'PUT', 'DELETE'] as const) {
      const described = describeApiFailure(unanswered(method, 'unknown'));
      expect(described).toContain('Call this tool again.');
      expect(described).not.toContain('duplicate');
    }
  });

  it('spares a POST that changes nothing the warning', () => {
    const described = describeApiFailure(unanswered('POST', 'unknown'), {
      safeToRepeat: true,
    });

    expect(described).toContain('Call this tool again.');
    expect(described).not.toContain('duplicate');
  });

  // The field is absent on every failure the API answered, and on one built
  // before this existed.
  it('says nothing when the outcome was never classified', () => {
    expect(describeApiFailure(unanswered('POST', undefined))).toBe(
      'POST /actions?projectId=p1: request failed (fetch failed)'
    );
  });
});

describe('apiFailureResult', () => {
  it('marks the result an error and keeps the tool summary', () => {
    expect(
      apiFailureResult('Failed to retrieve run data', {
        ok: false,
        method: 'GET',
        path: '/runs/run-1',
        status: 404,
        body: { message: 'run not found' },
      })
    ).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Failed to retrieve run data: GET /runs/run-1: HTTP 404 {"message":"run not found"}',
        },
      ],
    });
  });
});
