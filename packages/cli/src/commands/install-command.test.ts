import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BuildNotFoundError } from '../cli-errors.js';
import { makeTmpDir, realRepoRoot, removeDir } from '../test-support/tmp-agent-repo.js';
import { runBuild } from './build-command.js';
import { runInstall } from './install-command.js';

// install integration: build cat-01 → tmp out, then copy claude artifacts into a tmp dest.
// Covers copy correctness, --force overwrite guard, and the not-built error.

describe('runInstall', () => {
  const root = realRepoRoot();
  let out: string;
  let dest: string;

  beforeEach(() => {
    out = makeTmpDir('caesar-cli-iout-');
    dest = makeTmpDir('caesar-cli-dest-');
    // Build claude artifacts the install command will consume.
    runBuild({ out, root, tool: ['claude'], category: ['01'] });
  });
  afterEach(() => {
    removeDir(out);
    removeDir(dest);
  });

  it('copies built claude artifacts for the category into --dest', () => {
    const result = runInstall({ category: 'core-development', tool: 'claude', dest, out, root });
    expect(result.copied.length).toBeGreaterThan(0);
    expect(result.skipped).toEqual([]);
    const agentsDir = join(dest, '.claude', 'agents');
    expect(existsSync(agentsDir)).toBe(true);
    expect(readdirSync(agentsDir)).toContain('api-designer.md');
  });

  it('accepts the numeric category prefix and full name', () => {
    expect(
      runInstall({ category: '01', tool: 'claude', dest, out, root }).copied.length,
    ).toBeGreaterThan(0);
  });

  it('skips existing files without --force (no clobber)', () => {
    const first = runInstall({ category: '01', tool: 'claude', dest, out, root });
    expect(first.copied.length).toBeGreaterThan(0);

    // Mark one installed file so we can prove it was NOT overwritten.
    const marked = first.copied[0] as string;
    writeFileSync(marked, 'USER EDIT', 'utf8');

    const second = runInstall({ category: '01', tool: 'claude', dest, out, root });
    expect(second.copied).toEqual([]);
    expect(second.skipped.length).toBe(first.copied.length);
    expect(readFileSync(marked, 'utf8')).toBe('USER EDIT');
  });

  it('overwrites existing files when --force is set', () => {
    const first = runInstall({ category: '01', tool: 'claude', dest, out, root });
    const marked = first.copied[0] as string;
    writeFileSync(marked, 'USER EDIT', 'utf8');

    const forced = runInstall({ category: '01', tool: 'claude', dest, out, root, force: true });
    expect(forced.copied.length).toBe(first.copied.length);
    expect(forced.skipped).toEqual([]);
    expect(readFileSync(marked, 'utf8')).not.toBe('USER EDIT');
  });

  it('errors with a build hint when artifacts for the tool are missing', () => {
    // opencode was never built into `out`.
    let thrown: unknown;
    try {
      runInstall({ category: '01', tool: 'opencode', dest, out, root });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(BuildNotFoundError);
    expect((thrown as BuildNotFoundError).hint).toMatch(/build/);
  });

  it('throws a usage error when --tool is omitted', () => {
    expect(() => runInstall({ category: '01', dest, out, root })).toThrow(/--tool/);
  });

  it('throws a usage error when category is omitted', () => {
    expect(() => runInstall({ tool: 'claude', dest, out, root })).toThrow(/category/);
  });

  it('never writes outside --dest', () => {
    // A clean dest dir that already exists; the install must stay inside it.
    mkdirSync(dest, { recursive: true });
    const result = runInstall({ category: '01', tool: 'claude', dest, out, root });
    for (const abs of result.copied) {
      expect(abs.startsWith(dest)).toBe(true);
    }
  });
});

describe('runInstall — extended targets (kilo aggregate, openhands folder-nested)', () => {
  const root = realRepoRoot();
  let out: string;
  let dest: string;

  beforeEach(() => {
    out = makeTmpDir('caesar-cli-iout2-');
    dest = makeTmpDir('caesar-cli-dest2-');
  });
  afterEach(() => {
    removeDir(out);
    removeDir(dest);
  });

  it('copies the whole .kilocodemodes aggregate (no per-category slug filter)', () => {
    runBuild({ out, root, tool: ['kilo'], category: ['01'] });
    const result = runInstall({ category: 'core-development', tool: 'kilo', dest, out, root });
    expect(result.copied.length).toBe(1);
    expect(existsSync(join(dest, '.kilocodemodes'))).toBe(true);
  });

  it('copies openhands {slug}/SKILL.md using the parent-dir slug (not the basename)', () => {
    runBuild({ out, root, tool: ['openhands'], category: ['01'] });
    const result = runInstall({ category: '01', tool: 'openhands', dest, out, root });
    expect(result.copied.length).toBeGreaterThan(0);
    // slug derived from the folder segment, not "SKILL" basename.
    expect(existsSync(join(dest, '.agents', 'skills', 'api-designer', 'SKILL.md'))).toBe(true);
    // every copied file is a SKILL.md
    expect(result.copied.every((p) => p.endsWith('SKILL.md'))).toBe(true);
  });

  it('copies gemini flat per-agent files filtered by slug', () => {
    runBuild({ out, root, tool: ['gemini'], category: ['01'] });
    const result = runInstall({ category: '01', tool: 'gemini', dest, out, root });
    expect(result.copied.length).toBeGreaterThan(0);
    expect(existsSync(join(dest, '.gemini', 'agents', 'api-designer.md'))).toBe(true);
  });
});
