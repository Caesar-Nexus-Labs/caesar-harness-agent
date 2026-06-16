import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readLock, writeLock } from '../caesar-lock.js';
import { PluginNotFoundError } from '../cli-errors.js';
import { makeTmpDir, removeDir } from '../test-support/tmp-agent-repo.js';
import { runRemove } from './remove-command.js';

vi.mock('../resolve-global-path.js', () => {
  let globalDir = '';
  return {
    setGlobalDir(dir: string) {
      globalDir = dir;
    },
    resolveGlobalCaesarDir: () => join(globalDir, 'Caesar'),
  };
});

describe('runRemove', () => {
  let cwd: string;
  let globalDir: string;

  beforeEach(async () => {
    cwd = makeTmpDir('caesar-rm-cwd-');
    globalDir = makeTmpDir('caesar-rm-global-');
    // @ts-expect-error
    const { setGlobalDir } = await import('../resolve-global-path.js');
    setGlobalDir(globalDir);
  });

  afterEach(() => {
    removeDir(cwd);
    removeDir(globalDir);
    vi.clearAllMocks();
  });

  it('throws PluginNotFoundError if not in lock', () => {
    expect(() => runRemove({ name: 'test-plugin', cwd })).toThrow(PluginNotFoundError);
  });

  it('skips error if --force is provided and not in lock', () => {
    const res = runRemove({ name: 'test-plugin', cwd, force: true });
    expect(res.removedPaths.length).toBe(0);
    expect(res.skippedPaths.length).toBe(0);
  });

  it('removes files and lock entry (project scope)', () => {
    // Setup a fake lock and files
    const file1 = join(cwd, '.claude', 'agents', 'agent1.md');
    mkdirSync(join(cwd, '.claude', 'agents'), { recursive: true });
    writeFileSync(file1, 'content');

    writeLock(cwd, {
      lockfileVersion: 1,
      plugins: {
        'test-plugin@1.0.0|project': {
          name: 'test-plugin',
          version: '1.0.0',
          source: 'local',
          resolved: '/local/path',
          integrity: 'sha512-xxx',
          installedTools: ['claude'],
          installedPaths: [file1],
          scope: 'project',
          installedAt: new Date().toISOString(),
        },
      },
    });

    const res = runRemove({ name: 'test-plugin', cwd });

    expect(res.removedPaths.length).toBe(1);
    expect(res.skippedPaths.length).toBe(0);
    expect(existsSync(file1)).toBe(false);

    // Verify lock
    const updatedLock = readLock(cwd);
    expect(updatedLock.plugins['test-plugin@1.0.0|project']).toBeUndefined();
  });

  it('handles isWithin path traversal attempt', () => {
    // Malicious lock
    const maliciousPath = join(cwd, '..', 'evil.txt');
    writeFileSync(maliciousPath, 'evil');

    writeLock(cwd, {
      lockfileVersion: 1,
      plugins: {
        'evil@1.0.0|project': {
          name: 'evil',
          version: '1.0.0',
          source: 'local',
          resolved: '/local/path',
          integrity: 'sha512-xxx',
          installedTools: ['claude'],
          installedPaths: [maliciousPath],
          scope: 'project',
          installedAt: new Date().toISOString(),
        },
      },
    });

    expect(() => runRemove({ name: 'evil', cwd })).toThrow(/Path traversal attempt/);
  });
});
