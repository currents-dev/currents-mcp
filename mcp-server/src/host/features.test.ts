import { describe, expect, it } from 'vitest';
import {
  featuresFromLauncher,
  parseFeatures,
  UnknownFeatureError,
} from './features';

describe('parseFeatures', () => {
  // The point of the whole file: the shared gate reads an absent `orgFeatures`
  // as "allow every gated tool", so a host that wants the opposite has to hand
  // it a set rather than nothing.
  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['whitespace and commas only', ' , ,  '],
  ])('is an empty set when %s', (_name, list) => {
    expect(parseFeatures(list)).toEqual({});
  });

  it('enables exactly what it is given', () => {
    expect(parseFeatures('evidenceSharing')).toEqual({
      evidenceSharing: true,
    });
  });

  it('takes a list, ignoring spacing', () => {
    expect(parseFeatures(' evidenceSharing , aiAnalysis ')).toEqual({
      evidenceSharing: true,
      aiAnalysis: true,
    });
  });

  it('refuses an unknown feature and names the valid ones', () => {
    expect(() => parseFeatures('evidenceSharing,evidenceShareing')).toThrow(
      UnknownFeatureError
    );
    expect(() => parseFeatures('nope')).toThrow(/Known features are/);
  });

  // Refused rather than dropped: an ignored typo costs a tool the launcher
  // believes it asked for, and an absent tool is not something a model can
  // report back.
  it('refuses rather than keeping the half it understood', () => {
    expect(() => parseFeatures('aiAnalysis,typo')).toThrow(/typo/);
  });
});

describe('featuresFromLauncher', () => {
  it('reads the flag as a separate argument', () => {
    expect(
      featuresFromLauncher(['node', 'mcp', '--features', 'aiAnalysis'], {})
    ).toEqual({ aiAnalysis: true });
  });

  it('reads the flag written with an equals sign', () => {
    expect(
      featuresFromLauncher(['node', 'mcp', '--features=aiAnalysis'], {})
    ).toEqual({ aiAnalysis: true });
  });

  it('falls back to the environment', () => {
    expect(
      featuresFromLauncher(['node', 'mcp'], {
        CURRENTS_MCP_FEATURES: 'evidenceSharing',
      })
    ).toEqual({ evidenceSharing: true });
  });

  // A client configuration passes arguments; an inherited environment is
  // whatever the shell happened to carry.
  it('prefers the flag over the environment', () => {
    expect(
      featuresFromLauncher(['node', 'mcp', '--features', 'aiAnalysis'], {
        CURRENTS_MCP_FEATURES: 'evidenceSharing',
      })
    ).toEqual({ aiAnalysis: true });
  });

  it('is an empty set when the launcher says nothing', () => {
    expect(featuresFromLauncher(['node', 'mcp'], {})).toEqual({});
  });
});
