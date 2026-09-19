import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from './concurrency';

/** Records how many calls overlapped, so a limit can be asserted on. */
const tracking = () => {
  const state = { running: 0, peak: 0, order: [] as number[] };
  const run = async (item: number) => {
    state.running += 1;
    state.peak = Math.max(state.peak, state.running);
    state.order.push(item);
    await new Promise((resolve) => setTimeout(resolve, 1));
    state.running -= 1;
    return item * 2;
  };
  return { state, run };
};

describe('mapWithConcurrency', () => {
  it('answers in the order the items were given', async () => {
    const { run } = tracking();
    await expect(mapWithConcurrency([1, 2, 3, 4, 5], 2, run)).resolves.toEqual([
      2, 4, 6, 8, 10,
    ]);
  });

  it('runs no more than the limit at once', async () => {
    const { state, run } = tracking();
    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8], 3, run);
    expect(state.peak).toBe(3);
  });

  it('starts every item', async () => {
    const { state, run } = tracking();
    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 2, run);
    expect(state.order.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('runs one at a time for a limit below one', async () => {
    const { state, run } = tracking();
    await mapWithConcurrency([1, 2, 3], 0, run);
    expect(state.peak).toBe(1);
  });

  it('answers nothing for no items', async () => {
    const { state, run } = tracking();
    await expect(mapWithConcurrency([], 4, run)).resolves.toEqual([]);
    expect(state.peak).toBe(0);
  });

  it('rejects with what an item threw', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (item) => {
        if (item === 2) {
          throw new Error('boom');
        }
        return item;
      })
    ).rejects.toThrow('boom');
  });

  // Anything still running once this has answered is outside the limit, which
  // is the whole of what the caller asked for.
  it('leaves nothing running once it has answered', async () => {
    let running = 0;
    let settled = false;
    let ranAfterSettling = 0;

    const pending = mapWithConcurrency(
      [1, 2, 3, 4, 5, 6, 7, 8],
      3,
      async (item) => {
        running += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (settled) {
          ranAfterSettling += 1;
        }
        running -= 1;
        if (item === 2) {
          throw new Error('boom');
        }
        return item;
      }
    );

    await expect(pending).rejects.toThrow('boom');
    settled = true;
    expect(running).toBe(0);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(ranAfterSettling).toBe(0);
  });

  it('stops claiming items once one has failed', async () => {
    const started: number[] = [];

    await expect(
      mapWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8], 2, async (item) => {
        started.push(item);
        await new Promise((resolve) => setTimeout(resolve, 1));
        if (item === 1) {
          throw new Error('boom');
        }
        return item;
      })
    ).rejects.toThrow('boom');

    // The two in the first wave, and nothing claimed after the failure.
    expect(started).toEqual([1, 2]);
  });

  it('throws the first rejection, not a later one', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3, 4], 4, async (item) => {
        await new Promise((resolve) => setTimeout(resolve, item));
        throw new Error(`boom ${item}`);
      })
    ).rejects.toThrow('boom 1');
  });
});
