import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addEntry,
  CaesarLockSchema,
  listEntries,
  type PluginLockEntry,
  readLock,
  removeEntry,
  writeLock,
} from './caesar-lock.js';
import { UsageError } from './cli-errors.js';

describe('caesar-lock', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'caesar-lock-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const mockEntry: PluginLockEntry = {
    name: '@caesar/lang',
    version: '0.1.0',
    source: 'npm',
    resolved: 'https://registry.npmjs.org/@caesar/lang/-/lang-0.1.0.tgz',
    integrity: 'sha512-mock',
    installedTools: ['claude', 'opencode'],
    installedPaths: ['.claude/agents/foo.md'],
    scope: 'project',
    installedAt: '2026-06-16T22:30:00Z',
  };

  it('validates schema correctly', () => {
    const valid = {
      lockfileVersion: 1,
      plugins: {
        '@caesar/lang@0.1.0|project': mockEntry,
      },
    };
    expect(() => CaesarLockSchema.parse(valid)).not.toThrow();

    const invalid = {
      lockfileVersion: 2, // Must be 1
      plugins: {},
    };
    expect(() => CaesarLockSchema.parse(invalid)).toThrow();
  });

  it('readLock returns empty lock when file is absent', () => {
    const lock = readLock(tmpDir);
    expect(lock).toEqual({ lockfileVersion: 1, plugins: {} });
  });

  it('throws UsageError on corrupt JSON', () => {
    writeFileSync(join(tmpDir, 'caesar.lock'), '{ bad json', 'utf8');
    expect(() => readLock(tmpDir)).toThrow(UsageError);
  });

  it('throws UsageError on invalid schema', () => {
    writeFileSync(join(tmpDir, 'caesar.lock'), JSON.stringify({ lockfileVersion: 999 }), 'utf8');
    expect(() => readLock(tmpDir)).toThrow(UsageError);
  });

  it('writeLock and readLock round-trip is lossless', () => {
    let lock = readLock(tmpDir);
    lock = addEntry(lock, mockEntry);

    writeLock(tmpDir, lock);

    const readBack = readLock(tmpDir);
    expect(readBack).toEqual(lock);
  });

  it('addEntry is idempotent (same key overwrites)', () => {
    let lock = readLock(tmpDir);
    lock = addEntry(lock, mockEntry);

    // Add again with a minor modification to verify it overwrites
    const modifiedEntry = { ...mockEntry, integrity: 'sha512-new' };
    lock = addEntry(lock, modifiedEntry);

    const entries = listEntries(lock);
    expect(entries).toHaveLength(1);
    expect(entries[0].integrity).toBe('sha512-new');
  });

  it('removeEntry removes existing key and is a no-op on missing key', () => {
    let lock = readLock(tmpDir);
    lock = addEntry(lock, mockEntry);

    // Remove non-existent key
    lock = removeEntry(lock, 'does-not-exist', '1.0.0', 'project');
    expect(listEntries(lock)).toHaveLength(1);

    // Remove existing key
    lock = removeEntry(lock, mockEntry.name, mockEntry.version, mockEntry.scope);
    expect(listEntries(lock)).toHaveLength(0);
  });

  it('listEntries filters by scope correctly', () => {
    let lock = readLock(tmpDir);
    lock = addEntry(lock, mockEntry);

    const globalEntry: PluginLockEntry = {
      ...mockEntry,
      scope: 'global',
      version: '0.2.0',
    };
    lock = addEntry(lock, globalEntry);

    expect(listEntries(lock)).toHaveLength(2);
    expect(listEntries(lock, 'project')).toHaveLength(1);
    expect(listEntries(lock, 'project')[0].scope).toBe('project');
    expect(listEntries(lock, 'global')).toHaveLength(1);
    expect(listEntries(lock, 'global')[0].scope).toBe('global');
  });
});
