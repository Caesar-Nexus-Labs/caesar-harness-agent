import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeLock } from '../caesar-lock.js';
import { makeTmpDir, removeDir } from '../test-support/tmp-agent-repo.js';
import { runList } from './list-command.js';

vi.mock('../resolve-global-path.js', () => {
  let globalDir = '';
  return {
    setGlobalDir(dir: string) {
      globalDir = dir;
    },
    resolveGlobalCaesarDir: () => join(globalDir, 'Caesar'),
  };
});

describe('runList', () => {
  let cwd: string;
  let globalDir: string;

  beforeEach(async () => {
    cwd = makeTmpDir('caesar-list-cwd-');
    globalDir = makeTmpDir('caesar-list-global-');
    mkdirSync(join(globalDir, 'Caesar'), { recursive: true });
    // @ts-expect-error
    const { setGlobalDir } = await import('../resolve-global-path.js');
    setGlobalDir(globalDir);
  });

  afterEach(() => {
    removeDir(cwd);
    removeDir(globalDir);
    vi.clearAllMocks();
  });

  it('returns empty list if no locks exist', () => {
    const res = runList({ cwd });
    expect(res.entries).toEqual([]);
  });

  it('lists project scope only by default', () => {
    writeLock(cwd, {
      lockfileVersion: 1,
      plugins: {
        'proj@1.0.0|project': {
          name: 'proj',
          version: '1.0.0',
          source: 'npm',
          resolved: 'npm:proj',
          integrity: '',
          installedTools: ['claude'],
          installedPaths: [],
          scope: 'project',
          installedAt: '2026-06-16T00:00:00Z',
        },
      },
    });

    writeLock(join(globalDir, 'Caesar'), {
      lockfileVersion: 1,
      plugins: {
        'glob@1.0.0|global': {
          name: 'glob',
          version: '1.0.0',
          source: 'npm',
          resolved: 'npm:glob',
          integrity: '',
          installedTools: ['opencode'],
          installedPaths: [],
          scope: 'global',
          installedAt: '2026-06-16T00:00:00Z',
        },
      },
    });

    const res = runList({ cwd });
    expect(res.entries).toHaveLength(1);
    expect(res.entries[0]?.name).toBe('proj');
  });

  it('lists global scope only with --global', () => {
    writeLock(cwd, {
      lockfileVersion: 1,
      plugins: {
        'proj@1.0.0|project': {
          name: 'proj',
          version: '1.0.0',
          source: 'npm',
          resolved: 'npm:proj',
          integrity: '',
          installedTools: ['claude'],
          installedPaths: [],
          scope: 'project',
          installedAt: '2026-06-16T00:00:00Z',
        },
      },
    });

    writeLock(join(globalDir, 'Caesar'), {
      lockfileVersion: 1,
      plugins: {
        'glob@1.0.0|global': {
          name: 'glob',
          version: '1.0.0',
          source: 'npm',
          resolved: 'npm:glob',
          integrity: '',
          installedTools: ['opencode'],
          installedPaths: [],
          scope: 'global',
          installedAt: '2026-06-16T00:00:00Z',
        },
      },
    });

    const res = runList({ cwd, global: true });
    expect(res.entries).toHaveLength(1);
    expect(res.entries[0]?.name).toBe('glob');
  });

  it('lists both scopes with --all', () => {
    writeLock(cwd, {
      lockfileVersion: 1,
      plugins: {
        'proj@1.0.0|project': {
          name: 'proj',
          version: '1.0.0',
          source: 'npm',
          resolved: 'npm:proj',
          integrity: '',
          installedTools: ['claude'],
          installedPaths: [],
          scope: 'project',
          installedAt: '2026-06-16T00:00:00Z',
        },
      },
    });

    writeLock(join(globalDir, 'Caesar'), {
      lockfileVersion: 1,
      plugins: {
        'glob@1.0.0|global': {
          name: 'glob',
          version: '1.0.0',
          source: 'npm',
          resolved: 'npm:glob',
          integrity: '',
          installedTools: ['opencode'],
          installedPaths: [],
          scope: 'global',
          installedAt: '2026-06-17T00:00:00Z',
        },
      },
    });

    const res = runList({ cwd, all: true });
    expect(res.entries).toHaveLength(2);
    // Should be sorted by installedAt descending
    expect(res.entries[0]?.name).toBe('glob');
    expect(res.entries[1]?.name).toBe('proj');
  });
});
