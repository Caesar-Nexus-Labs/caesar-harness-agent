import { describe, expect, it } from 'vitest';
import { getToolTargetMeta, isToolTarget, TOOL_TARGETS } from './tool-targets.js';

// tool-targets: registry membership + per-target output metadata. Locks the 3 extended targets
// (openhands, gemini, kilo) added alongside the original 6 native + agents-md fallback.

describe('TOOL_TARGETS registry', () => {
  it('recognizes the 3 extended targets', () => {
    expect(isToolTarget('openhands')).toBe(true);
    expect(isToolTarget('gemini')).toBe(true);
    expect(isToolTarget('kilo')).toBe(true);
  });

  it('still recognizes the original targets + rejects unknown', () => {
    expect(isToolTarget('claude')).toBe(true);
    expect(isToolTarget('agents-md')).toBe(true);
    expect(isToolTarget('roo')).toBe(false);
    expect(isToolTarget('notatool')).toBe(false);
  });

  it('lists all 10 targets', () => {
    expect(TOOL_TARGETS).toHaveLength(10);
  });
});

describe('TOOL_TARGET_META for extended targets', () => {
  it('openhands → folder-per-skill under .agents/skills', () => {
    expect(getToolTargetMeta('openhands')).toEqual({
      tier: 'native',
      fileExtension: '.md',
      outputSubdir: '.agents/skills',
    });
  });

  it('gemini → flat per-agent under .gemini/agents', () => {
    expect(getToolTargetMeta('gemini')).toEqual({
      tier: 'native',
      fileExtension: '.md',
      outputSubdir: '.gemini/agents',
    });
  });

  it('kilo → aggregate at repo root with .kilocodemodes extension', () => {
    expect(getToolTargetMeta('kilo')).toEqual({
      tier: 'native',
      fileExtension: '.kilocodemodes',
      outputSubdir: '',
    });
  });
});
