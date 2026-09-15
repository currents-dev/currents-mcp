import { describe, expect, it } from 'vitest';
import { createActionTool } from './actions/create-action';
import { deleteActionTool } from './actions/delete-action';
import { getActionTool } from './actions/get-action';
import { getAffectedTestExecutionsByActionTool } from './actions/get-affected-test-executions-by-action';
import { getAffectedTestExecutionsTool } from './actions/get-affected-test-executions';
import { listAffectedTestsTool } from './actions/list-affected-tests';
import { updateActionTool } from './actions/update-action';
import { getProjectTool } from './projects/get-project';
import { cancelRunTool } from './runs/cancel-run';
import { deleteRunTool } from './runs/delete-run';
import { getRunDetailsTool } from './runs/get-run';
import { resetRunTool } from './runs/reset-run';
import { getSpecInstancesTool } from './specs/get-spec-instances';
import { deleteWebhookTool } from './webhooks/delete-webhook';
import { getWebhookTool } from './webhooks/get-webhook';
import { updateWebhookTool } from './webhooks/update-webhook';

const dates = { date_start: '2026-01-01', date_end: '2026-01-31' };

describe('required identifiers reject an empty string', () => {
  const cases: {
    name: string;
    schema: { parse: (v: unknown) => unknown };
    input: unknown;
  }[] = [
    {
      name: 'get-action',
      schema: getActionTool.schema,
      input: { actionId: '' },
    },
    {
      name: 'delete-action',
      schema: deleteActionTool.schema,
      input: { actionId: '' },
    },
    {
      name: 'update-action',
      schema: updateActionTool.schema,
      input: { actionId: '', name: 'renamed' },
    },
    {
      name: 'get-project',
      schema: getProjectTool.schema,
      input: { projectId: '' },
    },
    { name: 'get-run', schema: getRunDetailsTool.schema, input: { runId: '' } },
    {
      name: 'delete-run',
      schema: deleteRunTool.schema,
      input: { runId: '' },
    },
    { name: 'cancel-run', schema: cancelRunTool.schema, input: { runId: '' } },
    {
      name: 'get-webhook',
      schema: getWebhookTool.schema,
      input: { hookId: '' },
    },
    {
      name: 'get-spec-instances',
      schema: getSpecInstancesTool.schema,
      input: { instanceId: '' },
    },
    {
      name: 'get-affected-test-executions',
      schema: getAffectedTestExecutionsTool.schema,
      input: { projectId: 'proj', signature: '', ...dates },
    },
  ];

  it.each(cases)('$name', ({ schema, input }) => {
    expect(() => schema.parse(input)).toThrow();
  });
});

describe('webhook ids must be a UUID', () => {
  const uuid = '3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';

  it.each([
    ['get-webhook', getWebhookTool],
    ['update-webhook', updateWebhookTool],
    ['delete-webhook', deleteWebhookTool],
  ])('%s rejects a non-UUID hookId', (_name, tool) => {
    expect(() =>
      tool.schema.parse({ hookId: 'not-a-uuid', label: 'renamed' })
    ).toThrow();
  });

  it('accepts a UUID', () => {
    expect(() => getWebhookTool.schema.parse({ hookId: uuid })).not.toThrow();
  });

  // A well-formed v1 UUID: catches a regression from uuidV4() to a generic
  // UUID check, which the malformed cases above would still pass.
  it.each([
    ['get-webhook', getWebhookTool],
    ['update-webhook', updateWebhookTool],
    ['delete-webhook', deleteWebhookTool],
  ])('%s rejects a non-v4 UUID', (_name, tool) => {
    expect(() =>
      tool.schema.parse({
        hookId: '3f1a2b4c-5d6e-1f70-8a9b-0c1d2e3f4a5b',
        label: 'renamed',
      })
    ).toThrow();
  });
});

describe('ISO date inputs', () => {
  it('rejects a malformed expiresAfter', () => {
    expect(() =>
      createActionTool.schema.parse({
        projectId: 'proj',
        name: 'action',
        action: [{ op: 'skip' }],
        matcher: {
          op: 'AND',
          cond: [{ type: 'title', op: 'eq', value: 'a' }],
        },
        expiresAfter: 'not-a-date',
      })
    ).toThrow();
  });

  it('accepts a null expiresAfter', () => {
    expect(() =>
      createActionTool.schema.parse({
        projectId: 'proj',
        name: 'action',
        action: [{ op: 'skip' }],
        matcher: {
          op: 'AND',
          cond: [{ type: 'title', op: 'eq', value: 'a' }],
        },
        expiresAfter: null,
      })
    ).not.toThrow();
  });

  it('rejects a malformed expiresAfter on update-action', () => {
    expect(() =>
      updateActionTool.schema.parse({
        actionId: 'action',
        expiresAfter: 'not-a-date',
      })
    ).toThrow();
  });

  it.each(['January 1, 2026', '01/02/2025', '2026-02-30', '2026-13-01'])(
    'rejects %s as a date bound',
    (value) => {
      expect(() =>
        listAffectedTestsTool.schema.parse({
          projectId: 'proj',
          date_start: value,
          date_end: '2026-01-31',
        })
      ).toThrow();
    }
  );

  it.each(['2026-01-01', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00+02:00'])(
    'accepts %s as a date bound',
    (value) => {
      expect(() =>
        listAffectedTestsTool.schema.parse({
          projectId: 'proj',
          date_start: value,
          date_end: '2026-06-01',
        })
      ).not.toThrow();
    }
  );

  // The actions routes declare expiresAfter z.string().datetime(), so a date on
  // its own or a numeric offset is refused where a date bound would take it.
  it.each(['2026-01-01', '2026-01-01T00:00:00+02:00', 'January 1, 2026'])(
    'rejects %s as expiresAfter',
    (value) => {
      expect(() =>
        updateActionTool.schema.parse({
          actionId: 'action',
          expiresAfter: value,
        })
      ).toThrow();
    }
  );

  // +25:00 passes the API's own parseISO check and then reaches
  // formatDateTime64Param as an Invalid Date, which throws — a 500, not a 400.
  it.each([
    '2026-01-01T10:00+99:99',
    '2026-01-01T10:00+00:60',
    '2026-01-01T10:00+25:00',
  ])('rejects %s as a date bound', (value) => {
    expect(() =>
      listAffectedTestsTool.schema.parse({
        projectId: 'proj',
        date_start: value,
        date_end: '2026-06-01',
      })
    ).toThrow();
  });

  it.each(['2026-01-01T10:00+14:00', '2026-01-01T10:00-12:00'])(
    'accepts %s as a date bound',
    (value) => {
      expect(() =>
        listAffectedTestsTool.schema.parse({
          projectId: 'proj',
          date_start: value,
          date_end: '2026-06-01',
        })
      ).not.toThrow();
    }
  );

  // parseISO takes 24:00 for the query bounds, but the actions routes check
  // expiresAfter with zod's .datetime(), which refuses hour 24.
  it('rejects an end-of-day hour as expiresAfter', () => {
    expect(() =>
      updateActionTool.schema.parse({
        actionId: 'action',
        expiresAfter: '2026-01-01T24:00:00Z',
      })
    ).toThrow();
  });

  it('accepts an end-of-day hour as a date bound', () => {
    expect(() =>
      listAffectedTestsTool.schema.parse({
        projectId: 'proj',
        date_start: '2026-01-01T24:00:00Z',
        date_end: '2026-06-01',
      })
    ).not.toThrow();
  });

  it('accepts a UTC timestamp as expiresAfter', () => {
    expect(() =>
      updateActionTool.schema.parse({
        actionId: 'action',
        expiresAfter: '2026-01-01T00:00:00Z',
      })
    ).not.toThrow();
  });

  it('rejects a malformed date_start', () => {
    expect(() =>
      listAffectedTestsTool.schema.parse({
        projectId: 'proj',
        date_start: 'last tuesday',
        date_end: '2026-01-31',
      })
    ).toThrow();
  });

  it('rejects an inverted range', () => {
    expect(() =>
      listAffectedTestsTool.schema.parse({
        projectId: 'proj',
        date_start: '2026-01-31',
        date_end: '2026-01-01',
      })
    ).toThrow();
  });

  // The API compares the bounds with isAfter, so a zero-width range is valid.
  it('accepts an equal start and end', () => {
    expect(() =>
      listAffectedTestsTool.schema.parse({
        projectId: 'proj',
        date_start: '2026-01-01',
        date_end: '2026-01-01',
      })
    ).not.toThrow();
  });

  it.each([
    [
      'get-affected-test-executions-by-action',
      getAffectedTestExecutionsByActionTool,
    ],
    ['get-affected-test-executions', getAffectedTestExecutionsTool],
  ])('rejects an inverted range in %s', (_name, tool) => {
    expect(() =>
      tool.schema.parse({
        projectId: 'proj',
        actionId: 'action',
        signature: 'sig',
        date_start: '2026-01-31',
        date_end: '2026-01-01',
      })
    ).toThrow();
  });
});

describe('array elements reject an empty value', () => {
  it('rejects a tag action with no tags', () => {
    expect(() =>
      updateActionTool.schema.parse({
        actionId: 'action',
        action: [{ op: 'tag', details: { tags: [] } }],
      })
    ).toThrow();
  });

  it('rejects an empty machineId', () => {
    expect(() =>
      resetRunTool.schema.parse({ runId: 'run', machineId: [''] })
    ).toThrow();
  });
});
