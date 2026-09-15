process.env.TZ = 'Europe/Berlin';

import { describe, expect, it } from 'vitest';
import { isOrderedDateRange } from './schema';

/**
 * The API process is UTC, so ordering has to be too, whatever zone the host
 * running these tools sits in. This file sets a zone with an offset because the
 * package otherwise runs its tests under TZ=Etc/Universal, where a host-local
 * reading and a UTC one land on the same instant and a regression is invisible.
 */
describe('isOrderedDateRange with the host east of UTC', () => {
  it.each([
    [
      'a date-only start before a timed end',
      '2026-01-02',
      '2026-01-02T01:00',
      true,
    ],
    [
      'a timed start after a date-only end',
      '2026-01-02T01:00',
      '2026-01-02',
      false,
    ],
    ['equal date-only bounds', '2026-01-02', '2026-01-02', true],
    [
      'a zoneless end read as UTC',
      '2026-01-02T00:30Z',
      '2026-01-02T01:00',
      true,
    ],
    ['a low year against a later one', '0050-01-01', '1000-01-01', true],
    [
      'end-of-day against the next midnight',
      '2026-01-01T24:00',
      '2026-01-02',
      true,
    ],
  ])('orders %s', (_name, date_start, date_end, expected) => {
    expect(isOrderedDateRange({ date_start, date_end })).toBe(expected);
  });
});
