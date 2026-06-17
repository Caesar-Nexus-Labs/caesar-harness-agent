import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateBashZshWrapper } from '../templates/wrapper-templates.js';

describe('Unix Shell Integration Wrapper Integration', () => {
  const testDir = join(tmpdir(), `caesar-integration-test-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  // Windows system might have bash (e.g. Git Bash)
  // Let's test if bash is executable in the current environment
  const hasBash = (() => {
    try {
      execSync('bash --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  })();

  const itIfBash = hasBash ? it : it.skip;

  itIfBash('should intercept subagent add command and transparently delegate others', () => {
    // 1. Write mock 'caesar' command in our testDir that echoes arguments to a log
    const caesarLog = join(testDir, 'caesar.log');
    const mockCaesar = join(testDir, 'caesar');
    writeFileSync(mockCaesar, `#!/bin/sh\necho "CAESAR:$@" >> "${caesarLog}"\n`, { mode: 0o755 });

    // 2. Write mock 'opencode' command in our testDir that echoes arguments to a log
    const opencodeLog = join(testDir, 'opencode.log');
    const mockOpencode = join(testDir, 'opencode');
    writeFileSync(mockOpencode, `#!/bin/sh\necho "OPENCODE:$@" >> "${opencodeLog}"\n`, {
      mode: 0o755,
    });

    // 3. Generate wrapper and write execution script
    const wrapper = generateBashZshWrapper('opencode');
    const runnerScript = join(testDir, 'run.sh');

    const scriptBody = `#!/bin/bash
export PATH="${testDir}:$PATH"
${wrapper}

# Execute intercepted command
opencode subagent add some-plugin
# Execute standard command
opencode dev --port 3000
`;
    writeFileSync(runnerScript, scriptBody, { mode: 0o755 });

    // 4. Run the runnerScript via bash
    execSync(`bash "${runnerScript}"`, {
      env: { ...process.env, PATH: `${testDir}:${process.env.PATH}` },
    });

    // 5. Assert the outcomes
    expect(existsSync(caesarLog)).toBe(true);
    const caesarContent = readFileSync(caesarLog, 'utf8');
    expect(caesarContent).toContain('CAESAR:add some-plugin --tool opencode');

    expect(existsSync(opencodeLog)).toBe(true);
    const opencodeContent = readFileSync(opencodeLog, 'utf8');
    expect(opencodeContent).toContain('OPENCODE:dev --port 3000');
  });
});
