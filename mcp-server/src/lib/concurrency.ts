/**
 * `items.map(run)` with at most `limit` running at once, answering the results
 * in the order the items were given.
 *
 * Its own few lines rather than a dependency: this package is published to
 * npm, where every dependency is one a consumer installs, and the four it has
 * today are the SDK, zod and two workspace packages.
 *
 * On a rejection it stops claiming items and then waits for the ones already
 * running, rather than rejecting the moment the first one fails. A bare
 * `Promise.all` answers the caller while its siblings are still going, so the
 * limit stops meaning anything the moment one item fails — the calls it was
 * holding back carry on outside it, against a host that has already been told
 * the work is over. The first rejection is what it throws; a later one is
 * dropped, the way `Promise.all` drops it.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  // A container rather than a `let`: the workers assign it and the check below
  // reads it after awaiting them, which narrowing on a local would not see.
  const first: { failure?: { error: unknown } } = {};
  let next = 0;

  const worker = async () => {
    for (let index = next++; index < items.length; index = next++) {
      if (first.failure) {
        return;
      }
      try {
        results[index] = await run(items[index], index);
      } catch (error) {
        first.failure ??= { error };
        return;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker)
  );
  if (first.failure) {
    throw first.failure.error;
  }
  return results;
}
