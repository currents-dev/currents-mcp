import { afterEach, describe, expect, it, vi } from 'vitest';
import * as request from '../../lib/request';
import { listTestIssuesTool } from './list-test-issues';

describe('listTestIssuesTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends a run and its test IDs to POST /projects/{projectId}/test-issues', async () => {
    vi.spyOn(request, 'postApi').mockResolvedValue({
      ok: true,
      data: { status: 'OK', data: { list: [] } },
    });

    await listTestIssuesTool.handler({
      projectId: 'p/1',
      runId: 'run-1',
      testIds: ['t1', 't2'],
    });

    expect(request.postApi).toHaveBeenCalledWith(
      '/projects/p%2F1/test-issues',
      {
        runId: 'run-1',
        testIds: ['t1', 't2'],
      }
    );
  });

  it('sends signatures with the optional paging and details fields', async () => {
    vi.spyOn(request, 'postApi').mockResolvedValue({
      ok: true,
      data: { status: 'OK', data: { list: [] } },
    });

    await listTestIssuesTool.handler({
      projectId: 'p1',
      signatures: ['sig-1'],
      includeDetails: false,
      page: 2,
      limit: 10,
    });

    expect(request.postApi).toHaveBeenCalledWith('/projects/p1/test-issues', {
      signatures: ['sig-1'],
      includeDetails: false,
      page: 2,
      limit: 10,
    });
  });

  it.each([
    ['neither signatures nor a run', { projectId: 'p1' }],
    [
      'signatures and a run',
      { projectId: 'p1', signatures: ['s'], runId: 'r', testIds: ['t'] },
    ],
    ['a run without test IDs', { projectId: 'p1', runId: 'r' }],
    ['a limit above 50', { projectId: 'p1', signatures: ['s'], limit: 51 }],
  ])('refuses %s before calling the API', (_name, input) => {
    expect(listTestIssuesTool.schema.safeParse(input).success).toBe(false);
  });

  it('names the status and body of a failed call', async () => {
    vi.spyOn(request, 'postApi').mockResolvedValue({
      ok: false,
      method: 'POST',
      path: '/projects/p1/test-issues',
      status: 404,
      body: { status: 'FAILED', error: 'Tests not found in run run-1: t9' },
    });

    const result = await listTestIssuesTool.handler({
      projectId: 'p1',
      runId: 'run-1',
      testIds: ['t9'],
    });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Failed to list linked tickets: POST /projects/p1/test-issues: HTTP 404 {"status":"FAILED","error":"Tests not found in run run-1: t9"}',
        },
      ],
    });
  });
});
