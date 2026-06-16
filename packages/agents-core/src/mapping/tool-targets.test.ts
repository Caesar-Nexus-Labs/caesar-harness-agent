import { describe, expect, it } from 'vitest';
import { getToolTargetMeta, isToolTarget, TOOL_TARGETS } from './tool-targets.js';

// tool-targets: registry membership + per-target output metadata. Locks the 3 extended targets
// (openhands, gemini, kilo) added alongside the original 6 native + agents-md fallback, and
// the 3 new multi-format targets (roo, cursor, claude-plugin) added in Phase 2.

describe('TOOL_TARGETS registry', () => {
  it('recognizes the 3 extended targets', () => {
    expect(isToolTarget('openhands')).toBe(true);
    expect(isToolTarget('gemini')).toBe(true);
    expect(isToolTarget('kilo')).toBe(true);
  });

  it('recognizes the 3 multi-format plugin targets', () => {
    expect(isToolTarget('roo')).toBe(true);
    expect(isToolTarget('cursor')).toBe(true);
    expect(isToolTarget('claude-plugin')).toBe(true);
  });

  it('still recognizes the original targets + rejects unknown', () => {
    expect(isToolTarget('claude')).toBe(true);
    expect(isToolTarget('agents-md')).toBe(true);
    expect(isToolTarget('notatool')).toBe(false);
    expect(isToolTarget('roomodes')).toBe(false);
  });

  it('lists all 13 targets', () => {
    expect(TOOL_TARGETS).toHaveLength(13);
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
