import {
  clearAggregateEmitters,
  type EmittedFile,
  registerAggregateEmitter,
} from '@caesar/agents-core';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveTools, splitToolsByTier } from './agent-selection.js';

// agent-selection: tool resolution + registry-based tier split. The split routes by
// AGGREGATE-emitter membership (NOT a hard-coded tool name), so a newly-registered aggregate
// target (e.g. kilo) lands in `fallback` without any edit to splitToolsByTier.

const dummyAggregate = (_agents: unknown, _ctx: unknown): EmittedFile => ({
  tool: 'kilo',
  relativePath: '.kilocodemodes',
  content: 'customModes: []\n',
});

describe('resolveTools', () => {
  it('accepts the new extended targets (gemini, openhands, kilo)', () => {
    expect(resolveTools(['gemini', 'openhands', 'kilo'])).toEqual(['gemini', 'openhands', 'kilo']);
  });

  it('throws on an unknown tool', () => {
    expect(() => resolveTools(['notatool'])).toThrow(/Unknown tool/);
  });
});

describe('splitToolsByTier (registry-based)', () => {
  afterEach(() => clearAggregateEmitters());

  it('routes a registered aggregate target (kilo) to fallback, per-agent tools to native', () => {
    registerAggregateEmitter('kilo', dummyAggregate);
    const { native, fallback } = splitToolsByTier(['kilo', 'claude', 'gemini']);
    expect(fallback).toEqual(['kilo']);
    expect(native).toEqual(['claude', 'gemini']);
  });

  it('without a registered aggregate emitter, the tool falls to native', () => {
    // kilo NOT registered here → treated as per-agent native.
    const { native, fallback } = splitToolsByTier(['kilo', 'claude']);
    expect(fallback).toEqual([]);
    expect(native).toEqual(['kilo', 'claude']);
  });
});
