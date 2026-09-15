import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as request from '../../lib/request';
import { listAffectedTestsTool } from './list-affected-tests';

vi.mock('../../lib/request');

describe('listAffectedTestsTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serializes action_type as repeated action_type per OpenAPI (form explode)', async () => {
    vi.spyOn(request, 'fetchApi').mockResolvedValue({
      ok: true,
      data: { status: 'OK', data: [] },
    });

    await listAffectedTestsTool.handler({
      projectId: 'p1',
      date_start: '2026-01-01',
      date_end: '2026-01-02',
      action_type: ['skip', 'tag'],
    });

    expect(request.fetchApi).toHaveBeenCalledWith(
      expect.stringContaining('action_type=skip')
    );
    expect(request.fetchApi).toHaveBeenCalledWith(
      expect.stringContaining('action_type=tag')
    );
  });
});
