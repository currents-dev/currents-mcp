import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger, setLogger, type LogSink } from './logger';

const sink = vi.fn();
const asSink = (): LogSink => ({
  debug: sink,
  info: sink,
  warn: sink,
  error: sink,
});

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLogger(asSink);
  });

  it.each([
    ['a newline', 'release\ninfo: forged line'],
    ['a carriage return', 'release\rinfo: forged line'],
    ['an ANSI sequence', 'release\u001b[31mred'],
  ])('flattens %s in a caller-supplied value', (_name, value) => {
    logger.info(`Creating action for project proj: ${value}`);

    const message = sink.mock.calls[0][0] as string;
    expect(message).not.toMatch(/[\u0000-\u001f\u007f-\u009f]/);
    expect(message).toContain('Creating action for project proj');
  });

  it('leaves an ordinary message intact', () => {
    logger.info('Fetching action abc-123');

    expect(sink).toHaveBeenCalledWith('Fetching action abc-123');
  });

  it('joins varargs and stringifies the ones that are not strings', () => {
    logger.error('failed', { status: 404 });

    expect(sink).toHaveBeenCalledWith('failed {"status":404}');
  });

  it('resolves the sink per call, so a later one takes over', () => {
    const second = vi.fn();
    setLogger(() => ({
      debug: second,
      info: second,
      warn: second,
      error: second,
    }));

    logger.info('after');

    expect(sink).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('after');
  });
});

describe('the default sink', () => {
  // stdout is the protocol on a stdio server, so a host that never calls
  // setLogger must still not write there.
  it('writes to stderr', async () => {
    vi.resetModules();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const fresh = await import('./logger');
    fresh.logger.warn('no host installed a logger');

    expect(err).toHaveBeenCalledWith('no host installed a logger');
    expect(log).not.toHaveBeenCalled();

    err.mockRestore();
    log.mockRestore();
  });
});
