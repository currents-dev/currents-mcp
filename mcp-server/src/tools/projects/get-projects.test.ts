import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as request from '../../lib/request';
import { getProjectsTool } from './get-projects';

vi.mock('../../lib/request');

describe('getProjectsTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return formatted project data on success', async () => {
    const mockProjects = [
      { id: '1', name: 'Project 1', cursor: 'cursor1' },
      { id: '2', name: 'Project 2', cursor: 'cursor2' },
    ];

    vi.spyOn(request, 'fetchCursorBasedPaginatedApi').mockResolvedValue({
      ok: true,
      data: { items: mockProjects },
    });

    const result = await getProjectsTool.handler({ fetchAll: true });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockProjects, null, 2),
        },
      ],
    });
    expect(request.fetchCursorBasedPaginatedApi).toHaveBeenCalledWith(
      '/projects',
      undefined
    );
  });

  // The marker a capped walk prints names `starting_after`, and `fetchAll` is
  // the argument it was printed under: a caller that follows the sentence as
  // written has to get the next 1000 and not the same first 1000.
  it('continues a capped walk from the cursor it is handed', async () => {
    vi.spyOn(request, 'fetchCursorBasedPaginatedApi').mockResolvedValue({
      ok: true,
      data: { items: [{ id: '3' }] },
    });

    await getProjectsTool.handler({
      fetchAll: true,
      starting_after: 'cursor1000',
    });

    expect(request.fetchCursorBasedPaginatedApi).toHaveBeenCalledWith(
      '/projects',
      'cursor1000'
    );
  });

  // A caller that reads a thousand serialized projects and then a note saying
  // the list was cut off has already decided what the list says.
  it('says the list is partial before listing it', async () => {
    vi.spyOn(request, 'fetchCursorBasedPaginatedApi').mockResolvedValue({
      ok: true,
      data: {
        items: [{ id: '1' }],
        truncated: 'Incomplete list: stopped at the 1000-item cap.',
      },
    });

    const result = await getProjectsTool.handler({ fetchAll: true });

    expect(result.content[0].text).toBe(
      `Incomplete list: stopped at the 1000-item cap.\n\n${JSON.stringify(
        [{ id: '1' }],
        null,
        2
      )}`
    );
  });

  it('should report the status the API failed with', async () => {
    vi.spyOn(request, 'fetchCursorBasedPaginatedApi').mockResolvedValue({
      ok: false,
      method: 'GET',
      path: '/projects',
      status: 401,
      body: { message: 'invalid api key' },
    });

    const result = await getProjectsTool.handler({ fetchAll: true });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Failed to retrieve projects: GET /projects: HTTP 401 {"message":"invalid api key"}',
        },
      ],
    });
  });

  it('should have correct schema structure', () => {
    expect(getProjectsTool.schema).toBeDefined();
    expect(typeof getProjectsTool.schema).toBe('object');
  });
});
