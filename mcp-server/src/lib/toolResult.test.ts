import { describe, expect, it } from 'vitest';
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
