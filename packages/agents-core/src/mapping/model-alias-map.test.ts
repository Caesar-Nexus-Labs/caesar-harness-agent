import { describe, expect, it } from 'vitest';
import { mapModel } from './model-alias-map.js';
import { TOOL_TARGETS } from './tool-targets.js';

describe('mapModel', () => {
  it('maps Claude tiers to short aliases', () => {
    expect(mapModel('inherit', 'claude')).toBe('inherit');
    expect(mapModel('fast', 'claude')).toBe('haiku');
    expect(mapModel('balanced', 'claude')).toBe('sonnet');
    expect(mapModel('top', 'claude')).toBe('opus');
  });

  it('maps Codex tiers to gpt ids; inherit omitted', () => {
    expect(mapModel('inherit', 'codex')).toBeUndefined();
    expect(mapModel('fast', 'codex')).toBe('gpt-5.4-mini');
    expect(mapModel('balanced', 'codex')).toBe('gpt-5.4');
    expect(mapModel('top', 'codex')).toBe('gpt-5.5');
  });

  it('maps provider/model-id tool (opencode) with anthropic default provider', () => {
    expect(mapModel('balanced', 'opencode')).toBe('anthropic/claude-sonnet-4-20250514');
    expect(mapModel('inherit', 'opencode')).toBeUndefined();
  });

  it('maps Kiro tiers to bare model ids; inherit omitted (no provider prefix)', () => {
    expect(mapModel('inherit', 'kiro')).toBeUndefined();
    expect(mapModel('fast', 'kiro')).toBe('claude-haiku-4');
    expect(mapModel('balanced', 'kiro')).toBe('claude-sonnet-4');
    expect(mapModel('top', 'kiro')).toBe('claude-opus-4');
  });

  it('honors a custom modelProvider for provider/model-id tools', () => {
    expect(mapModel('top', 'opencode', { modelProvider: 'bedrock' })).toBe(
      'bedrock/claude-opus-4-20250514',
    );
  });

  it('does not prefix provider for non provider/model-id tools', () => {
    expect(mapModel('top', 'claude', { modelProvider: 'bedrock' })).toBe('opus');
    expect(mapModel('top', 'codex', { modelProvider: 'bedrock' })).toBe('gpt-5.5');
  });

  it('applies per-install overrides ahead of defaults', () => {
    const overrides = { balanced: { claude: 'claude-3-7-sonnet', opencode: 'openai/gpt-4o' } };
    expect(mapModel('balanced', 'claude', { overrides })).toBe('claude-3-7-sonnet');
    expect(mapModel('balanced', 'opencode', { overrides })).toBe('openai/gpt-4o');
    // Non-overridden tier falls through to default.
    expect(mapModel('top', 'claude', { overrides })).toBe('opus');
  });

  it('returns undefined model for the agents-md fallback target', () => {
    for (const tier of ['inherit', 'fast', 'balanced', 'top'] as const) {
      expect(mapModel(tier, 'agents-md')).toBeUndefined();
    }
  });

  it('omits the model field on inherit for every tool except Claude', () => {
    // Claude Code accepts the literal `inherit` string (its documented default);
    // all other tools omit the field to inherit the parent/session model.
    for (const tool of TOOL_TARGETS) {
      if (tool === 'claude') {
        expect(mapModel('inherit', tool)).toBe('inherit');
      } else {
        expect(mapModel('inherit', tool)).toBeUndefined();
      }
    }
  });
});
