import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { EmittedFile } from './emitters/emitter-interface.js';
import { OutputPathError, writeOutputs } from './write-outputs.js';

describe('writeOutputs', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(join(tmpdir(), 'caesar-write-'));
  });

  afterEach(() => {
    rmSync(dist, { recursive: true, force: true });
  });

  it('writes each file under <distRoot>/<tool>/<relativePath> and creates dirs', () => {
    const files: EmittedFile[] = [
      { tool: 'claude', relativePath: '.claude/agents/code-reviewer.md', content: 'A' },
      { tool: 'opencode', relativePath: '.opencode/agents/code-reviewer.md', content: 'B' },
    ];

    const result = writeOutputs(files, dist);

    const claudePath = join(dist, 'claude', '.claude/agents/code-reviewer.md');
    const opencodePath = join(dist, 'opencode', '.opencode/agents/code-reviewer.md');
    expect(existsSync(claudePath)).toBe(true);
    expect(readFileSync(claudePath, 'utf8')).toBe('A');
    expect(readFileSync(opencodePath, 'utf8')).toBe('B');
    expect(result.written).toHaveLength(2);
  });

  it('rejects a relativePath containing .. traversal', () => {
    const files: EmittedFile[] = [
      { tool: 'claude', relativePath: '../../etc/passwd', content: 'x' },
    ];
    expect(() => writeOutputs(files, dist)).toThrow(OutputPathError);
  });

  it('rejects an absolute relativePath', () => {
    const abs = process.platform === 'win32' ? 'C:\\Windows\\system32\\evil' : '/etc/evil';
    const files: EmittedFile[] = [{ tool: 'claude', relativePath: abs, content: 'x' }];
    expect(() => writeOutputs(files, dist)).toThrow(OutputPathError);
  });

  it('rejects sneaky traversal that escapes the tool root mid-path', () => {
    const files: EmittedFile[] = [
      { tool: 'claude', relativePath: '.claude/../../../escape.md', content: 'x' },
    ];
    expect(() => writeOutputs(files, dist)).toThrow(OutputPathError);
  });

  it('does not write ANY file when one path is malicious (fail-fast)', () => {
    const files: EmittedFile[] = [
      { tool: 'claude', relativePath: 'ok/good.md', content: 'good' },
      { tool: 'claude', relativePath: '../escape.md', content: 'bad' },
    ];
    expect(() => writeOutputs(files, dist)).toThrow(OutputPathError);
    expect(existsSync(join(dist, 'claude', 'ok/good.md'))).toBe(false);
  });

  it('allows nested relative paths that stay within the tool root', () => {
    const files: EmittedFile[] = [
      { tool: 'kiro', relativePath: '.kiro/agents/sub/deep/agent.json', content: '{}' },
    ];
    const result = writeOutputs(files, dist);
    expect(existsSync(result.written[0] as string)).toBe(true);
  });

  it('rejects an unknown/malformed tool segment (traversal vector guard)', () => {
    const files = [
      { tool: '../../etc', relativePath: 'agent.md', content: 'bad' },
    ] as unknown as EmittedFile[];
    expect(() => writeOutputs(files, dist)).toThrow(OutputPathError);
  });
});
