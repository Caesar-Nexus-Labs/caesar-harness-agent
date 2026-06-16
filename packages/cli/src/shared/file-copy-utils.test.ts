import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  registerExtendedNativeEmitters,
  registerFallbackEmitters,
  registerNativeEmitters,
} from '@caesar/agents-core';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { includeFile, listFilesRecursive } from './file-copy-utils.js';

describe('file-copy-utils', () => {
  describe('listFilesRecursive', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'caesar-test-'));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns empty array for missing directory', () => {
      expect(listFilesRecursive(join(tmpDir, 'does-not-exist'))).toEqual([]);
    });

    it('lists files recursively', () => {
      writeFileSync(join(tmpDir, 'a.txt'), 'a');
      const sub = join(tmpDir, 'sub');
      mkdirSync(sub);
      writeFileSync(join(sub, 'b.txt'), 'b');

      const files = listFilesRecursive(tmpDir);
      // Depending on OS, paths might have backslashes, so we just check for expected names
      expect(files.some((f) => f.endsWith('a.txt'))).toBe(true);
      expect(files.some((f) => f.endsWith('b.txt'))).toBe(true);
      expect(files).toHaveLength(2);
    });
  });

  describe('includeFile', () => {
    beforeAll(() => {
      registerNativeEmitters();
      registerExtendedNativeEmitters();
      registerFallbackEmitters();
    });

    const slugs = new Set(['my-agent']);

    it('always includes aggregate indexes (e.g. kilo)', () => {
      expect(includeFile('kilo', 'any-file.txt', slugs)).toBe(true);
      expect(includeFile('agents-md', 'AGENTS.md', slugs)).toBe(true);
    });

    it('includes matched flat per-agent files (e.g. claude, copilot)', () => {
      expect(includeFile('claude', '.claude/agents/my-agent.md', slugs)).toBe(true);
      expect(includeFile('copilot', '.github/agents/my-agent.agent.md', slugs)).toBe(true);
    });

    it('excludes unmatched flat per-agent files', () => {
      expect(includeFile('claude', '.claude/agents/other.md', slugs)).toBe(false);
    });

    it('includes folder-nested openhands files', () => {
      expect(includeFile('openhands', '.agents/skills/my-agent/SKILL.md', slugs)).toBe(true);
    });

    it('excludes unmatched folder-nested openhands files', () => {
      expect(includeFile('openhands', '.agents/skills/other/SKILL.md', slugs)).toBe(false);
      expect(includeFile('openhands', '.agents/skills/my-agent/OTHER.md', slugs)).toBe(false);
    });
  });
});
