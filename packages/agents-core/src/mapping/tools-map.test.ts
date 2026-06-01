import { describe, expect, it } from 'vitest';
import type { Tool } from '../schema/enums.js';
import { mapTools } from './tools-map.js';

describe('mapTools', () => {
  it('maps an explicit canonical list to Claude PascalCase ids (deterministic order)', () => {
    expect(mapTools(['glob', 'read', 'grep'], 'claude', 'read-only')).toEqual([
      'Read',
      'Grep',
      'Glob',
    ]);
    expect(mapTools(['write', 'bash', 'edit', 'web'], 'claude', 'full')).toEqual([
      'Edit',
      'Write',
      'Bash',
      'WebFetch',
    ]);
  });

  it('maps an explicit list to OpenCode lowercase tool keys', () => {
    expect(mapTools(['read', 'edit', 'bash'], 'opencode', 'full')).toEqual([
      'read',
      'edit',
      'bash',
    ]);
  });

  it('maps to Kiro built-in ids (read/write/shell; search ops collapse to read)', () => {
    expect(mapTools(['read', 'bash', 'web'], 'kiro', 'full')).toEqual(['read', 'shell', 'fetch']);
    // grep/glob have no Kiro built-in → collapse to `read`; edit → `write`.
    expect(mapTools(['read', 'grep', 'glob', 'edit', 'write'], 'kiro', 'edit')).toEqual([
      'read',
      'write',
    ]);
  });

  it('collapses Copilot ids and dedups (read/grep/glob → read+search)', () => {
    expect(mapTools(['read', 'grep', 'glob'], 'copilot', 'read-only')).toEqual(['read', 'search']);
    expect(mapTools(['read', 'edit', 'write', 'bash', 'web'], 'copilot', 'full')).toEqual([
      'read',
      'edit',
      'execute',
      'web',
    ]);
  });

  it('returns undefined for Codex (no per-agent tools allowlist)', () => {
    expect(mapTools(['read', 'grep'], 'codex', 'read-only')).toBeUndefined();
    expect(mapTools([], 'codex', 'full')).toBeUndefined();
  });

  it('returns undefined for Factory and agents-md (no tools allowlist concept)', () => {
    expect(mapTools(['read'], 'factory', 'read-only')).toBeUndefined();
    expect(mapTools(['read'], 'agents-md', 'read-only')).toBeUndefined();
  });

  it('empty list + read-only → restricts to the read-only default triad (W2 semantics)', () => {
    expect(mapTools([], 'claude', 'read-only')).toEqual(['Read', 'Grep', 'Glob']);
    expect(mapTools([], 'opencode', 'read-only')).toEqual(['read', 'grep', 'glob']);
    // Copilot: read→read, grep/glob→search (deduped).
    expect(mapTools([], 'copilot', 'read-only')).toEqual(['read', 'search']);
  });

  it('empty list + edit/full → undefined (no restriction; emitter omits allowlist)', () => {
    expect(mapTools([], 'claude', 'edit')).toBeUndefined();
    expect(mapTools([], 'claude', 'full')).toBeUndefined();
    expect(mapTools([], 'opencode', 'full')).toBeUndefined();
  });

  it('preserves enum order regardless of input order', () => {
    const shuffled: Tool[] = ['web', 'bash', 'glob', 'read'];
    expect(mapTools(shuffled, 'claude', 'full')).toEqual(['Read', 'Glob', 'Bash', 'WebFetch']);
  });
});
