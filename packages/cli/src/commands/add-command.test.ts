import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readLock } from '../caesar-lock.js';
import type { PluginManifest } from '../plugin-manifest-schema.js';
import { makeTmpDir, removeDir } from '../test-support/tmp-agent-repo.js';
import { runAdd } from './add-command.js';

// Mock resolve-global-path to use a temp dir for globals
vi.mock('../resolve-global-path.js', () => {
  let globalDir = '';
  return {
    setGlobalDir(dir: string) {
      globalDir = dir;
    },
    resolveGlobalCaesarDir: () => join(globalDir, 'Caesar'),
    resolveGlobalToolDir: (tool: string) => join(globalDir, `.${tool}`, 'agents'),
  };
});

vi.mock('node:os', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:os')>();
  return {
    ...original,
    homedir: () => '/tmp/mock-home-for-tests',
  };
});

describe('runAdd', () => {
  let cwd: string;
  let globalDir: string;
  let localPluginDir: string;

  beforeEach(async () => {
    cwd = makeTmpDir('caesar-add-cwd-');
    globalDir = makeTmpDir('caesar-add-global-');
    // @ts-expect-error
    const { setGlobalDir } = await import('../resolve-global-path.js');
    setGlobalDir(globalDir);

    // Create a local plugin structure
    localPluginDir = makeTmpDir('caesar-local-plugin-');

    // Write manifest
    const manifest: PluginManifest = {
      type: 'agent-plugin',
      schemaVersion: 1,
      name: 'test-plugin',
      version: '1.0.0',
      categories: ['lang'],
      agentCount: 2,
      agentSlugs: ['agent1', 'agent2'],
      supportedTools: ['claude', 'opencode'],
    };
    const pkg = {
      name: 'test-plugin',
      version: '1.0.0',
      caesar: manifest,
    };
    writeFileSync(join(localPluginDir, 'package.json'), JSON.stringify(pkg, null, 2));

    // Write some artifacts
    const distDir = join(localPluginDir, 'dist');
    mkdirSync(join(distDir, 'claude', '.claude', 'agents'), { recursive: true });
    writeFileSync(
      join(distDir, 'claude', '.claude', 'agents', 'agent1.md'),
      'agent 1 claude content',
    );
    writeFileSync(
      join(distDir, 'claude', '.claude', 'agents', 'agent2.md'),
      'agent 2 claude content',
    );

    mkdirSync(join(distDir, 'opencode', '.opencode', 'agents'), { recursive: true });
    writeFileSync(
      join(distDir, 'opencode', '.opencode', 'agents', 'agent1.md'),
      'agent 1 opencode content',
    );
  });

  afterEach(() => {
    removeDir(cwd);
    removeDir(globalDir);
    removeDir(localPluginDir);
    vi.clearAllMocks();
  });

  it('installs from local path into project (dry run)', async () => {
    const result = await runAdd({
      source: localPluginDir,
      tool: ['claude'],
      cwd,
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.copiedPaths.length).toBe(2);
    expect(result.lockUpdated).toBe(false);

    // Verify no files were actually written
    expect(existsSync(join(cwd, '.claude', 'agents', 'agent1.md'))).toBe(false);
  });

  it('installs from local path into project', async () => {
    const result = await runAdd({
      source: localPluginDir,
      tool: ['claude'],
      cwd,
    });

    expect(result.copiedPaths.length).toBe(2);
    expect(result.lockUpdated).toBe(true);

    // Verify files
    expect(existsSync(join(cwd, '.claude', 'agents', 'agent1.md'))).toBe(true);
    expect(readFileSync(join(cwd, '.claude', 'agents', 'agent1.md'), 'utf-8')).toBe(
      'agent 1 claude content',
    );

    // Verify lock
    const lock = readLock(cwd);
    expect(lock.plugins['test-plugin@1.0.0|project']).toBeDefined();
    expect(lock.plugins['test-plugin@1.0.0|project']?.installedTools).toEqual(['claude']);
  });

  it('skips existing without --force', async () => {
    // First install
    await runAdd({ source: localPluginDir, tool: ['claude'], cwd });

    // Modify a file
    writeFileSync(join(cwd, '.claude', 'agents', 'agent1.md'), 'MODIFIED');

    // Second install without force
    const result2 = await runAdd({ source: localPluginDir, tool: ['claude'], cwd });
    expect(result2.copiedPaths.length).toBe(0);
    expect(result2.skippedPaths.length).toBe(2);
    expect(readFileSync(join(cwd, '.claude', 'agents', 'agent1.md'), 'utf-8')).toBe('MODIFIED');
  });

  it('overwrites with --force', async () => {
    await runAdd({ source: localPluginDir, tool: ['claude'], cwd });
    writeFileSync(join(cwd, '.claude', 'agents', 'agent1.md'), 'MODIFIED');

    const result2 = await runAdd({ source: localPluginDir, tool: ['claude'], cwd, force: true });
    expect(result2.copiedPaths.length).toBe(2);
    expect(result2.skippedPaths.length).toBe(0);
    expect(readFileSync(join(cwd, '.claude', 'agents', 'agent1.md'), 'utf-8')).toBe(
      'agent 1 claude content',
    );
  });

  it('installs into global dir when --global is used', async () => {
    const result = await runAdd({
      source: localPluginDir,
      tool: ['claude'],
      cwd,
      global: true,
    });

    expect(result.scope).toBe('global');
    expect(result.copiedPaths.length).toBe(2);

    // Should be in global dir, not cwd
    expect(existsSync(join(cwd, '.claude', 'agents', 'agent1.md'))).toBe(false);
    expect(existsSync(join(globalDir, '.claude', 'agents', 'agent1.md'))).toBe(true);

    // Global lockfile should be updated
    const lock = readLock(join(globalDir, 'Caesar'));
    expect(lock.plugins['test-plugin@1.0.0|global']).toBeDefined();
    expect(lock.plugins['test-plugin@1.0.0|global']?.scope).toBe('global');
  });

  it('auto-detects and prompts to install on TTY', async () => {
    // Imports readline dynamically to mock it
    const readline = await import('node:readline');
    mkdirSync(join(cwd, '.claude'), { recursive: true });

    const originalIsTTY = process.stdout.isTTY;
    process.stdout.isTTY = true;

    const spyReadline = vi.spyOn(readline.default, 'createInterface').mockReturnValue({
      question: (query: string, cb: (ans: string) => void) => {
        cb('y');
      },
      on: (event: string, cb: () => void) => {},
      close: () => {},
    } as any);

    const result = await runAdd({
      source: localPluginDir,
      cwd,
    });

    expect(result.installedTools).toEqual(['claude']);
    expect(existsSync(join(cwd, '.claude', 'agents', 'agent1.md'))).toBe(true);

    process.stdout.isTTY = originalIsTTY;
    spyReadline.mockRestore();
  });

  it('auto-detects and installs without prompts on non-TTY', async () => {
    mkdirSync(join(cwd, '.opencode'), { recursive: true });

    const originalIsTTY = process.stdout.isTTY;
    process.stdout.isTTY = false;

    const result = await runAdd({
      source: localPluginDir,
      cwd,
    });

    expect(result.installedTools).toEqual(['opencode']);
    expect(existsSync(join(cwd, '.opencode', 'agents', 'agent1.md'))).toBe(true);

    process.stdout.isTTY = originalIsTTY;
  });

  it('no-op on non-TTY when no tools are detected', async () => {
    const originalIsTTY = process.stdout.isTTY;
    process.stdout.isTTY = false;

    const result = await runAdd({
      source: localPluginDir,
      cwd,
    });

    expect(result.installedTools).toEqual([]);
    expect(result.copiedPaths.length).toBe(0);
    expect(result.lockUpdated).toBe(false);

    process.stdout.isTTY = originalIsTTY;
  });
});
