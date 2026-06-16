import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCli } from '../index.js';

// Setup CLI for testing
function runCli(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const cli = buildCli();

    // Mock console to prevent test output spam
    const originalLog = console.log;
    const originalError = console.error;
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;

    console.log = vi.fn();
    console.error = vi.fn();
    process.stdout.write = vi.fn() as any;
    process.stderr.write = vi.fn() as any;

    try {
      const parsed = cli.parse(['node', 'caesar', ...args], { run: false });
      if (!cli.matchedCommand) {
        throw new Error(`Command not found: ${args.join(' ')}`);
      }

      // Execute the command
      Promise.resolve(cli.matchedCommand.commandAction.apply(cli, [...parsed.args, parsed.options]))
        .then(() => {
          console.log = originalLog;
          console.error = originalError;
          process.stdout.write = originalStdoutWrite;
          process.stderr.write = originalStderrWrite;
          resolve();
        })
        .catch((err) => {
          console.log = originalLog;
          console.error = originalError;
          process.stdout.write = originalStdoutWrite;
          process.stderr.write = originalStderrWrite;
          reject(err);
        });
    } catch (err) {
      console.log = originalLog;
      console.error = originalError;
      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;
      reject(err);
    }
  });
}

// Mock child_process for npm installation
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    execSync: vi.fn((cmd: string) => {
      if (cmd.includes('npm pack')) {
        // We don't actually pack in tests. Instead, we pretend it worked.
        // We'll map the package name back to the local source path in the test.
        return Buffer.from('mock-package-1.0.0.tgz');
      }
      return actual.execSync(cmd);
    }),
  };
});

// We need a test mock for `resolveGlobalCaesarDir` and `resolveGlobalToolDir`
// since the env var approach might have ordering issues. But we already implemented
// the env var approach in `resolve-global-path.ts` (Phase 10 Step 1), so let's set it.

describe('Plugin Harness Integration', () => {
  let tmpRoot: string;
  let tmpCwd: string;
  let tmpGlobal: string;
  let originalCwd: () => string;

  beforeEach(() => {
    tmpRoot = join(tmpdir(), `caesar-test-${randomUUID()}`);
    tmpCwd = join(tmpRoot, 'project');
    tmpGlobal = join(tmpRoot, 'global');

    mkdirSync(tmpCwd, { recursive: true });
    mkdirSync(tmpGlobal, { recursive: true });

    // Mock CWD
    originalCwd = process.cwd;
    process.cwd = () => tmpCwd;

    // Set Global Override
    process.env.CAESAR_GLOBAL_DIR = tmpGlobal;
  });

  afterEach(() => {
    process.cwd = originalCwd;
    delete process.env.CAESAR_GLOBAL_DIR;
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('performs full add -> list -> remove lifecycle locally', async () => {
    const sourcePath = join(originalCwd(), 'packages', 'categories', 'caesar-core-dev');

    // 1. ADD
    await runCli(['add', sourcePath, '--tool', 'opencode']);

    // Verify it was added to project
    const lockPath = join(tmpCwd, 'caesar.lock');
    expect(existsSync(lockPath)).toBe(true);

    // Verify files were copied (opencode puts agents in .opencode/agents)
    const agentPath = join(tmpCwd, '.opencode', 'agents', 'backend-developer.md');
    expect(existsSync(agentPath)).toBe(true);

    // 2. LIST
    // Since we mock console.log, we can't easily assert the text output directly from `runCli`,
    // but we know it doesn't throw. We can read the lockfile.
    const lockContent = JSON.parse(readFileSync(lockPath, 'utf8'));
    const entryKey = Object.keys(lockContent.plugins).find((k) =>
      k.startsWith('@caesar/core-dev@'),
    );
    expect(entryKey).toBeDefined();

    // 3. REMOVE
    await runCli(['remove', '@caesar/core-dev']);

    // Verify files are removed
    expect(existsSync(agentPath)).toBe(false);

    // Verify lock is empty
    const newLock = JSON.parse(readFileSync(lockPath, 'utf8'));
    expect(Object.keys(newLock.plugins).length).toBe(0);
  });

  it('supports --dry-run without modifying disk', async () => {
    const sourcePath = join(originalCwd(), 'packages', 'categories', 'caesar-core-dev');

    await runCli(['add', sourcePath, '--tool', 'opencode', '--dry-run']);

    // Verify no lockfile was created
    expect(existsSync(join(tmpCwd, 'caesar.lock'))).toBe(false);

    // Verify no agents directory was created
    expect(existsSync(join(tmpCwd, '.opencode'))).toBe(false);
  });

  it('supports --global installation', async () => {
    const sourcePath = join(originalCwd(), 'packages', 'categories', 'caesar-core-dev');

    await runCli(['add', sourcePath, '--tool', 'opencode', '--global']);

    // Verify no lockfile in project
    expect(existsSync(join(tmpCwd, 'caesar.lock'))).toBe(false);

    // Verify global lockfile created
    const globalLockPath = join(tmpGlobal, 'caesar.lock');
    expect(existsSync(globalLockPath)).toBe(true);

    // Verify files copied to global opencode dir
    // resolveOpenCodeGlobalDir(tmpGlobal) returns join(tmpGlobal, 'opencode', 'agents')
    const globalAgentPath = join(tmpGlobal, 'opencode', 'agents', 'backend-developer.md');
    expect(existsSync(globalAgentPath)).toBe(true);

    // Remove global
    await runCli(['remove', '@caesar/core-dev', '--global']);
    expect(existsSync(globalAgentPath)).toBe(false);
  });

  it('blocks path traversal via malicious paths in lockfile', async () => {
    const sourcePath = join(originalCwd(), 'packages', 'categories', 'caesar-core-dev');
    await runCli(['add', sourcePath, '--tool', 'opencode']);

    // Maliciously modify lockfile
    const lockPath = join(tmpCwd, 'caesar.lock');
    const lockContent = JSON.parse(readFileSync(lockPath, 'utf8'));
    const entryKey = Object.keys(lockContent.plugins).find((k) =>
      k.startsWith('@caesar/core-dev@'),
    );
    lockContent.plugins[entryKey!].installedPaths.push('../../../secret.txt');
    writeFileSync(lockPath, JSON.stringify(lockContent, null, 2));

    await expect(runCli(['remove', '@caesar/core-dev'])).rejects.toThrow('Path traversal attempt');
  });
});
