import { afterEach, describe, expect, it, vi } from 'vitest';
import * as request from '../../lib/request';
import { listProjectPullRequestsTool } from './list-project-pull-requests';

type ToolArgs = Parameters<typeof listProjectPullRequestsTool.handler>[0];

async function requestedUrl(args: ToolArgs): Promise<URL> {
  const fetchApi = vi.spyOn(request, 'fetchApi').mockResolvedValue({
    ok: true,
    data: { status: 'OK', data: [] },
  });
  await listProjectPullRequestsTool.handler(args);
  return new URL(fetchApi.mock.lastCall?.[0] as string, 'http://api.test');
}

describe('listProjectPullRequestsTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serializes query per OpenAPI (repeated status, bracket arrays)', async () => {
    vi.spyOn(request, 'fetchApi').mockResolvedValue({
      ok: true,
      data: { status: 'OK', data: [] },
    });

    await listProjectPullRequestsTool.handler({
      projectId: 'p1',
      limit: 20,
      status: ['PASSED', 'FAILED'],
      tags: ['smoke'],
      branches: ['main'],
      authors: ['dev@*'],
    });

    const url = vi.mocked(request.fetchApi).mock.calls[0][0] as string;
    expect(url).toContain('/projects/p1/pull-requests?');
    expect(url).toContain('limit=20');
    expect(url).toContain('status=PASSED');
    expect(url).toContain('status=FAILED');
    expect(url).toContain('tags%5B%5D=smoke');
    expect(url).toContain('branches%5B%5D=main');
    expect(url).toContain('authors%5B%5D=dev%40');
  });

  it('sends only the parameters it was given', async () => {
    const url = await requestedUrl({
      projectId: 'p1',
      limit: 5,
      runs_per_pr: 5,
      tag_operator: 'OR',
    });

    expect(url.pathname).toBe('/projects/p1/pull-requests');
    expect([...url.searchParams.keys()]).toEqual([
      'limit',
      'runs_per_pr',
      'tag_operator',
    ]);
  });

  it('serializes the pull request list filters, order and total', async () => {
    const url = await requestedUrl({
      projectId: 'p1',
      search: 'fix login',
      pr_search: '#3665',
      date_start: '2026-09-01',
      date_end: '2026-09-12T10:00:00Z',
      environments: ['staging', 'production'],
      completion_state: ['CANCELED', 'TIMEOUT'],
      pr_id: 'github:currents-dev/currents#3665',
      order: 'run_count',
      dir: 'asc',
      include_total: true,
    });

    const params = url.searchParams;
    expect(params.get('search')).toBe('fix login');
    expect(params.get('pr_search')).toBe('#3665');
    expect(params.get('date_start')).toBe('2026-09-01');
    expect(params.get('date_end')).toBe('2026-09-12T10:00:00Z');
    expect(params.getAll('environments[]')).toEqual(['staging', 'production']);
    expect(params.getAll('completion_state')).toEqual(['CANCELED', 'TIMEOUT']);
    expect(params.get('pr_id')).toBe('github:currents-dev/currents#3665');
    expect(params.get('order')).toBe('run_count');
    expect(params.get('dir')).toBe('asc');
    expect(params.get('include_total')).toBe('true');
  });

  it('sends runs_per_pr 0 and include_total false', async () => {
    const url = await requestedUrl({
      projectId: 'p1',
      runs_per_pr: 0,
      include_total: false,
    });

    expect(url.searchParams.get('runs_per_pr')).toBe('0');
    expect(url.searchParams.get('include_total')).toBe('false');
  });
});

describe('listProjectPullRequestsTool schema', () => {
  const accepts = (args: Record<string, unknown>) =>
    listProjectPullRequestsTool.schema.safeParse({ projectId: 'p1', ...args })
      .success;

  it('takes runs_per_pr from 0 to 10', () => {
    expect(accepts({ runs_per_pr: 0 })).toBe(true);
    expect(accepts({ runs_per_pr: 10 })).toBe(true);
    expect(accepts({ runs_per_pr: -1 })).toBe(false);
    expect(accepts({ runs_per_pr: 11 })).toBe(false);
  });

  it('checks search as the route does: printable ASCII, 1-200 characters after trimming', () => {
    expect(accepts({ search: ` ${'a'.repeat(200)} ` })).toBe(true);
    expect(accepts({ search: 'a'.repeat(201) })).toBe(false);
    expect(accepts({ search: '   ' })).toBe(false);
    expect(accepts({ search: 'naïve' })).toBe(false);
    expect(accepts({ search: 'a\tb' })).toBe(false);
  });

  it('checks pr_search as the route does: no control characters, 200 code points', () => {
    expect(accepts({ pr_search: 'Ünïcode title' })).toBe(true);
    expect(accepts({ pr_search: '🚀'.repeat(200) })).toBe(true);
    expect(accepts({ pr_search: '🚀'.repeat(201) })).toBe(false);
    expect(accepts({ pr_search: '' })).toBe(false);
    expect(accepts({ pr_search: 'a\u0085b' })).toBe(false);
    expect(accepts({ pr_search: 'a\u0007b' })).toBe(false);
  });

  it('takes one date alone and rejects date_start after date_end', () => {
    expect(accepts({ date_start: '2026-09-01' })).toBe(true);
    expect(accepts({ date_end: '2026-09-01T10:00:00Z' })).toBe(true);
    expect(
      accepts({ date_start: '2026-09-01', date_end: '2026-09-01T00:00:00Z' })
    ).toBe(true);
    expect(accepts({ date_start: '2026-09-02', date_end: '2026-09-01' })).toBe(
      false
    );
    expect(accepts({ date_start: 'September 1, 2026' })).toBe(false);
  });

  it('takes the enum values the route takes', () => {
    expect(accepts({ order: 'first_run', dir: 'desc' })).toBe(true);
    expect(accepts({ order: 'created_at' })).toBe(false);
    expect(accepts({ dir: 'up' })).toBe(false);
    expect(accepts({ completion_state: ['COMPLETE', 'IN_PROGRESS'] })).toBe(
      true
    );
    expect(accepts({ completion_state: ['DONE'] })).toBe(false);
  });

  it('takes environments and pr_id without spaces or control characters', () => {
    expect(accepts({ environments: ['staging'] })).toBe(true);
    expect(accepts({ environments: ['my env'] })).toBe(false);
    expect(accepts({ pr_id: 'x'.repeat(128) })).toBe(true);
    expect(accepts({ pr_id: 'x'.repeat(129) })).toBe(false);
    expect(accepts({ pr_id: '' })).toBe(false);
  });
});
