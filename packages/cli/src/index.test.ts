import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCli, main } from './index.js';
import {
  makeTmpDir,
  makeTmpRepoWithCat01,
  realRepoRoot,
  removeDir,
  writeBadAgent,
} from './test-support/tmp-agent-repo.js';

// index wiring smoke: drive main() through cac the same way the bin does (crafted argv), proving
// arg-parse → command → exit-code mapping end to end. No shell spawn — calls the entry directly.

const ARGV0 = ['node', 'caesar'];

describe('CLI entry (cac wiring)', () => {
  const dirs: string[] = [];
  let stdout: ReturnType<typeof vi.spyOn>;
  let stderr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.exitCode = undefined;
    stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });
  afterEach(() => {
    stdout.mockRestore();
    stderr.mockRestore();
    process.exitCode = undefined;
    for (const d of dirs.splice(0)) removeDir(d);
  });

  function tmpRepo(): string {
    const root = makeTmpRepoWithCat01();
    dirs.push(root);
    return root;
  }

  it('registers build, validate, and install commands', () => {
    const cli = buildCli();
    const names = cli.commands.map((c) => c.name);
    expect(names).toContain('build');
    expect(names).toContain('validate');
    expect(names).toContain('install');
  });

  it('exits 2 (usage) on a bare invocation and prints help', () => {
    main([...ARGV0]);
    expect(process.exitCode).toBe(2);
  });

  it('build writes output and exits 0', () => {
    const out = makeTmpDir('caesar-cli-eout-');
    dirs.push(out);
    main([
      ...ARGV0,
      'build',
      '--tool',
      'claude',
      '--category',
      '01',
      '--out',
      out,
      '--root',
      realRepoRoot(),
    ]);
    expect(process.exitCode ?? 0).toBe(0);
    expect(existsSync(join(out, 'claude', '.claude', 'agents'))).toBe(true);
  });

  it('validate exits 0 on a clean repo', () => {
    main([...ARGV0, 'validate', '--root', tmpRepo()]);
    expect(process.exitCode ?? 0).toBe(0);
  });

  it('validate exits 1 on an invalid repo', () => {
    const root = tmpRepo();
    writeBadAgent(root);
    main([...ARGV0, 'validate', '--root', root]);
    expect(process.exitCode).toBe(1);
  });

  it('install exits 2 (usage) with a hint when not built', () => {
    const out = makeTmpDir('caesar-cli-nb-');
    const dest = makeTmpDir('caesar-cli-nbd-');
    dirs.push(out, dest);
    main([
      ...ARGV0,
      'install',
      '01',
      '--tool',
      'opencode',
      '--out',
      out,
      '--dest',
      dest,
      '--root',
      realRepoRoot(),
    ]);
    expect(process.exitCode).toBe(2);
  });

  it('emits JSON when --json is passed to build', () => {
    const out = makeTmpDir('caesar-cli-json-');
    dirs.push(out);
    main([
      ...ARGV0,
      'build',
      '--tool',
      'claude',
      '--category',
      '01',
      '--out',
      out,
      '--root',
      realRepoRoot(),
      '--json',
    ]);
    const printed = stdout.mock.calls.map((c) => String(c[0])).join('');
    expect(() => JSON.parse(printed)).not.toThrow();
  });
});
