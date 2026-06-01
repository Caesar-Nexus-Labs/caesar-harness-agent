import { describe, expect, it } from 'vitest';
import { mapPermission } from './permission-map.js';

describe('mapPermission', () => {
  it('maps Claude permissionMode per tier', () => {
    expect(mapPermission('read-only', 'claude')).toEqual({ permissionMode: 'plan' });
    expect(mapPermission('edit', 'claude')).toEqual({ permissionMode: 'acceptEdits' });
    expect(mapPermission('full', 'claude')).toEqual({ permissionMode: 'default' });
  });

  it('maps OpenCode permission block; read-only denies edit + bash', () => {
    expect(mapPermission('read-only', 'opencode')).toEqual({
      permission: { edit: 'deny', bash: 'deny' },
    });
    expect(mapPermission('edit', 'opencode')).toEqual({
      permission: { edit: 'allow', bash: 'ask' },
    });
    expect(mapPermission('full', 'opencode')).toEqual({
      permission: { edit: 'allow', bash: 'allow' },
    });
  });

  it('maps Codex sandbox_mode per tier (full → workspace-write, conservative)', () => {
    expect(mapPermission('read-only', 'codex')).toEqual({ sandbox_mode: 'read-only' });
    expect(mapPermission('edit', 'codex')).toEqual({ sandbox_mode: 'workspace-write' });
    expect(mapPermission('full', 'codex')).toEqual({ sandbox_mode: 'workspace-write' });
  });

  it('maps Factory tools category per tier (full → omit tools, grants all)', () => {
    expect(mapPermission('read-only', 'factory')).toEqual({ tools: 'read-only' });
    expect(mapPermission('edit', 'factory')).toEqual({ tools: 'edit' });
    expect(mapPermission('full', 'factory')).toEqual({});
  });

  it('maps Kilo groups per tier (read-only → [read]; full → +command)', () => {
    expect(mapPermission('read-only', 'kilo')).toEqual({ groups: ['read'] });
    expect(mapPermission('edit', 'kilo')).toEqual({ groups: ['read', 'edit'] });
    expect(mapPermission('full', 'kilo')).toEqual({ groups: ['read', 'edit', 'command'] });
  });

  it('returns undefined for tools with no sandbox/permission field', () => {
    for (const perm of ['read-only', 'edit', 'full'] as const) {
      expect(mapPermission(perm, 'kiro')).toBeUndefined();
      expect(mapPermission(perm, 'copilot')).toBeUndefined();
      expect(mapPermission(perm, 'agents-md')).toBeUndefined();
      // Gemini + OpenHands are inherit-only (no permission field) — undefined by design.
      expect(mapPermission(perm, 'gemini')).toBeUndefined();
      expect(mapPermission(perm, 'openhands')).toBeUndefined();
    }
  });
});
