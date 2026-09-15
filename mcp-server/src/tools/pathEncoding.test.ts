import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as request from '../lib/request';
import { deleteActionTool } from './actions/delete-action';
import { disableActionTool } from './actions/disable-action';
import { enableActionTool } from './actions/enable-action';
import { getActionTool } from './actions/get-action';
import { getAffectedTestExecutionsByActionTool } from './actions/get-affected-test-executions-by-action';
import { getAffectedTestExecutionsTool } from './actions/get-affected-test-executions';
import { updateActionTool } from './actions/update-action';
import { getErrorsExplorerTool } from './errors/get-errors-explorer';
import { getProjectInsightsTool } from './projects/get-project-insights';
import { getProjectTool } from './projects/get-project';
import { cancelRunTool } from './runs/cancel-run';
import { deleteRunTool } from './runs/delete-run';
import { getRunDetailsTool } from './runs/get-run';
import { getRunsTool } from './runs/get-runs';
import { resetRunTool } from './runs/reset-run';
import { getSpecFilesPerformanceTool } from './specs/get-spec-files-performance';
import { getSpecInstancesTool } from './specs/get-spec-instances';
import { getTestResultsTool } from './tests/get-test-results';
import { getTestsPerformanceTool } from './tests/get-tests-performance';
import { deleteWebhookTool } from './webhooks/delete-webhook';
import { getWebhookTool } from './webhooks/get-webhook';
import { updateWebhookTool } from './webhooks/update-webhook';

vi.mock('../lib/request');

const dates = { date_start: '2026-01-01', date_end: '2026-01-31' };

// A value that changes the request's route once the URL is normalized, rather
// than one that merely fails to match a record.
const traversal = '../webhooks/e2e';
const encoded = '..%2Fwebhooks%2Fe2e';

type Verb = 'fetchApi' | 'putApi' | 'deleteApi';

const cases: {
  name: string;
  verb: Verb;
  call: () => Promise<unknown>;
  path: string;
}[] = [
  {
    name: 'get-action',
    verb: 'fetchApi',
    call: () => getActionTool.handler({ actionId: traversal }),
    path: `/actions/${encoded}`,
  },
  {
    name: 'delete-action',
    verb: 'deleteApi',
    call: () => deleteActionTool.handler({ actionId: traversal }),
    path: `/actions/${encoded}`,
  },
  {
    name: 'enable-action',
    verb: 'putApi',
    call: () => enableActionTool.handler({ actionId: traversal }),
    path: `/actions/${encoded}/enable`,
  },
  {
    name: 'disable-action',
    verb: 'putApi',
    call: () => disableActionTool.handler({ actionId: traversal }),
    path: `/actions/${encoded}/disable`,
  },
  {
    name: 'update-action',
    verb: 'putApi',
    call: () =>
      updateActionTool.handler({ actionId: traversal, name: 'renamed' }),
    path: `/actions/${encoded}`,
  },
  {
    name: 'get-affected-test-executions-by-action',
    verb: 'fetchApi',
    call: () =>
      getAffectedTestExecutionsByActionTool.handler({
        actionId: traversal,
        ...dates,
      }),
    path: `/actions/${encoded}/tests`,
  },
  {
    name: 'get-affected-test-executions',
    verb: 'fetchApi',
    call: () =>
      getAffectedTestExecutionsTool.handler({
        projectId: 'proj',
        signature: traversal,
        ...dates,
      }),
    path: `/actions/tests/${encoded}`,
  },
  {
    name: 'get-project',
    verb: 'fetchApi',
    call: () => getProjectTool.handler({ projectId: traversal }),
    path: `/projects/${encoded}`,
  },
  {
    name: 'get-project-insights',
    verb: 'fetchApi',
    call: () =>
      getProjectInsightsTool.handler({ projectId: traversal, ...dates }),
    path: `/projects/${encoded}/insights`,
  },
  {
    name: 'get-runs',
    verb: 'fetchApi',
    call: () => getRunsTool.handler({ projectId: traversal }),
    path: `/projects/${encoded}/runs`,
  },
  {
    name: 'get-run',
    verb: 'fetchApi',
    call: () => getRunDetailsTool.handler({ runId: traversal }),
    path: `/runs/${encoded}`,
  },
  {
    name: 'delete-run',
    verb: 'deleteApi',
    call: () => deleteRunTool.handler({ runId: traversal }),
    path: `/runs/${encoded}`,
  },
  {
    name: 'cancel-run',
    verb: 'putApi',
    call: () => cancelRunTool.handler({ runId: traversal }),
    path: `/runs/${encoded}/cancel`,
  },
  {
    name: 'reset-run',
    verb: 'putApi',
    call: () =>
      resetRunTool.handler({ runId: traversal, machineId: ['machine-1'] }),
    path: `/runs/${encoded}/reset`,
  },
  {
    name: 'get-webhook',
    verb: 'fetchApi',
    call: () => getWebhookTool.handler({ hookId: traversal }),
    path: `/webhooks/${encoded}`,
  },
  {
    name: 'delete-webhook',
    verb: 'deleteApi',
    call: () => deleteWebhookTool.handler({ hookId: traversal }),
    path: `/webhooks/${encoded}`,
  },
  {
    name: 'update-webhook',
    verb: 'putApi',
    call: () =>
      updateWebhookTool.handler({
        hookId: traversal,
        label: 'renamed',
      }),
    path: `/webhooks/${encoded}`,
  },
  {
    name: 'get-spec-instances',
    verb: 'fetchApi',
    call: () => getSpecInstancesTool.handler({ instanceId: traversal }),
    path: `/instances/${encoded}`,
  },
  {
    name: 'get-spec-files-performance',
    verb: 'fetchApi',
    call: () =>
      getSpecFilesPerformanceTool.handler({ projectId: traversal, ...dates }),
    path: `/spec-files/${encoded}`,
  },
  {
    name: 'get-test-results',
    verb: 'fetchApi',
    call: () => getTestResultsTool.handler({ signature: traversal, ...dates }),
    path: `/test-results/${encoded}`,
  },
  {
    name: 'get-tests-performance',
    verb: 'fetchApi',
    call: () =>
      getTestsPerformanceTool.handler({ projectId: traversal, ...dates }),
    path: `/tests/${encoded}`,
  },
  {
    name: 'get-errors-explorer',
    verb: 'fetchApi',
    call: () =>
      getErrorsExplorerTool.handler({ projectId: traversal, ...dates }),
    path: `/errors/${encoded}`,
  },
];

describe('dynamic path segments are encoded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(cases)('$name', async ({ verb, call, path }) => {
    const spy = vi
      .spyOn(request, verb)
      .mockResolvedValue({ ok: true, data: {} } as never);

    await call();

    expect(spy).toHaveBeenCalledOnce();
    const requested = String(spy.mock.calls[0][0]);
    expect(requested.split('?')[0]).toBe(path);
    expect(requested).not.toContain(traversal);
  });
});
