import { z } from 'zod';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:[0-5]\d)?$/;
const UTC_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/;

/**
 * Written with primitives zod 3 and zod 4 both have, rather than `z.iso.date()`
 * and `z.iso.datetime()`. The package depends on zod 4, but it is the only
 * workspace that does — the rest of the monorepo is zod 3 — so it typechecks
 * against whichever copy resolves, and a zod-4-only call fails the build when
 * the nested copy is not there.
 */
function isCalendarDate(year: string, month: string, day: string): boolean {
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1) {
    return false;
  }
  // Day 0 of the following month is the last day of this one.
  return d <= new Date(Date.UTC(Number(year), m, 0)).getUTCDate();
}

/**
 * `endOfDay` because the two contracts differ on hour 24: `parseISO` reads
 * `24:00` as midnight the next day and the query bounds go through it, while
 * `expiresAfter` is checked with zod's `.datetime()`, which refuses hour 24
 * outright.
 */
function isClockTime(
  hour: string,
  minute: string,
  second: string | undefined,
  endOfDay: boolean
): boolean {
  const h = Number(hour);
  const m = Number(minute);
  const sec = second === undefined ? 0 : Number(second);
  if (m > 59 || sec > 59) {
    return false;
  }
  // 24:30 is not a time in either contract.
  return h === 24 ? endOfDay && m === 0 && sec === 0 : h <= 23;
}

const HAS_ZONE = /(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * The API validates these bounds with `parseISO`, which reads a form carrying
 * no zone in its own process's timezone. Nothing sets TZ in the API image or
 * its task definition, so that process is UTC — so reading a zoneless bound as
 * UTC here agrees with the API whether this runs inside it or as a local stdio
 * server in some other zone. `Date.parse` would read `2026-01-01T10:00` as
 * host-local instead, which orders differently for a host east or west of UTC.
 */
function toInstant(value: string): number {
  if (DATE_ONLY.test(value)) {
    // Date.parse already reads a date on its own as UTC midnight.
    return Date.parse(value);
  }
  return Date.parse(HAS_ZONE.test(value) ? value : `${value}Z`);
}

function matchesIsoDate(value: string): boolean {
  const parts = DATE_ONLY.exec(value);
  return parts !== null && isCalendarDate(parts[1], parts[2], parts[3]);
}

function matchesIsoDateTime(
  value: string,
  pattern: RegExp,
  endOfDay: boolean
): boolean {
  const parts = pattern.exec(value);
  return (
    parts !== null &&
    isCalendarDate(parts[1], parts[2], parts[3]) &&
    isClockTime(parts[4], parts[5], parts[6], endOfDay) &&
    // The routes forward the bound through `new Date(...)`, and an offset it
    // cannot read reaches `formatDateTime64Param`'s `toISOString()` as an
    // Invalid Date and throws — a 500 rather than a validation error. So the
    // binding contract is what the API forwards with, not the wider set
    // `parseISO` validates: +25:00 passes that and crashes the endpoint.
    !Number.isNaN(toInstant(value))
  );
}

/**
 * For the query bounds the affected-test routes validate with date-fns
 * `parseISO` (`validateQueryDateStart` in
 * packages/api/src/api/validation/index.ts), which takes a date on its own as
 * well as a full timestamp but rejects `January 1, 2026`, `01/02/2025` and
 * out-of-range days like `2026-02-30` — all of which `Date.parse` accepts and
 * would send on to a 400.
 *
 * The one shape `parseISO` takes and this does not is an ISO week date
 * (`2026-W01`). Nothing asks a caller for one, and rejecting it names the
 * expected format instead of failing at the API.
 */
export const isoDateString = () =>
  z
    .string()
    .refine(
      (value) =>
        matchesIsoDate(value) || matchesIsoDateTime(value, DATE_TIME, true),
      { message: 'Expected an ISO 8601 date or date-time' }
    );

/**
 * `expiresAfter` is stricter than the query bounds: the actions routes declare
 * it `z.string().datetime()` (`CreateActionSchema` in
 * packages/api/src/api/actions/actions.validation.ts), which requires a UTC
 * timestamp and refuses a date on its own or a numeric offset.
 */
export const isoDateTimeString = () =>
  z
    .string()
    .refine((value) => matchesIsoDateTime(value, UTC_DATE_TIME, false), {
      message: 'Expected a UTC ISO 8601 date-time',
    });

/**
 * The API compares the two with `isAfter`, so an equal start and end is a
 * valid single-instant range.
 */
export const isOrderedDateRange = ({
  date_start,
  date_end,
}: {
  date_start: string;
  date_end: string;
}) => toInstant(date_start) <= toInstant(date_end);

export const orderedDateRangeIssue = {
  message: '"date_start" should be less than or equal to "date_end"',
  path: ['date_start'],
};

/**
 * Mirrors UUID_V4_REGEX in packages/api/src/api/webhooks/webhooks.validation.ts,
 * which rejects any other shape of hookId with a 400. Reusing the pattern rather
 * than zod's own `uuid({ version: 'v4' })` keeps the two from drifting apart.
 */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const uuidV4 = () =>
  z.string().regex(UUID_V4, { message: 'Expected a UUID' });
