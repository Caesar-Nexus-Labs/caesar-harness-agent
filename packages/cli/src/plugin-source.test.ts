import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UsageError } from './cli-errors.js';
import { parseSource, resolveSource } from './plugin-source.js';

describe('plugin-source', () => {
  describe('parseSource', () => {
    it('parses local paths', () => {
      expect(parseSource('./local/path')).toEqual({ type: 'local', path: './local/path' });
      expect(parseSource('../path')).toEqual({ type: 'local', path: '../path' });
      expect(parseSource('/absolute/path')).toEqual({ type: 'local', path: '/absolute/path' });
      expect(parseSource('C:\\path')).toEqual({ type: 'local', path: 'C:\\path' });
    });

    it('parses github shorthands with gh: and github:', () => {
      expect(parseSource('gh:owner/repo')).toEqual({
        type: 'github',
        owner: 'owner',
        repo: 'repo',
        ref: undefined,
      });
      expect(parseSource('github:owner/repo#branch')).toEqual({
        type: 'github',
        owner: 'owner',
        repo: 'repo',
        ref: 'branch',
      });
    });

    it('parses owner/repo implicitly as github', () => {
      expect(parseSource('owner/repo')).toEqual({
        type: 'github',
        owner: 'owner',
        repo: 'repo',
        ref: undefined,
      });
      expect(parseSource('owner/repo#v1.0')).toEqual({
        type: 'github',
        owner: 'owner',
        repo: 'repo',
        ref: 'v1.0',
      });
    });

    it('parses npm packages', () => {
      expect(parseSource('pkg')).toEqual({ type: 'npm', name: 'pkg', version: undefined });
      expect(parseSource('pkg@1.0.0')).toEqual({ type: 'npm', name: 'pkg', version: '1.0.0' });
      expect(parseSource('@scope/pkg')).toEqual({
        type: 'npm',
        name: '@scope/pkg',
        version: undefined,
      });
      expect(parseSource('@scope/pkg@2.0.0')).toEqual({
        type: 'npm',
        name: '@scope/pkg',
        version: '2.0.0',
      });
    });

    it('throws UsageError on invalid format', () => {
      expect(() => parseSource('')).toThrow(UsageError);
      expect(() => parseSource('gh:owner')).toThrow(UsageError);
    });
  });

  describe('resolveSource (local)', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'caesar-source-test-'));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('resolves valid local plugin', async () => {
      const validPkg = {
        name: 'test-plugin',
        version: '1.2.3',
        caesar: {
          type: 'agent-plugin',
          schemaVersion: 1,
          categories: ['test-category'],
          agentCount: 2,
          supportedTools: ['claude', 'kilo'],
        },
      };
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify(validPkg));

      const res = await resolveSource({ type: 'local', path: tmpDir }, { cwd: process.cwd() });

      expect(res.name).toBe('test-plugin');
      expect(res.version).toBe('1.2.3');
      expect(res.integrity).toBe('none');
      expect(res.distDir).toBe(join(tmpDir, 'dist'));
      expect(res.manifest.type).toBe('agent-plugin');

      // Cleanup is a no-op
      expect(() => res.cleanup()).not.toThrow();
    });

    it('throws if local path does not exist', async () => {
      await expect(
        resolveSource({ type: 'local', path: join(tmpDir, 'missing') }, { cwd: process.cwd() }),
      ).rejects.toThrow(UsageError);
    });

    it('throws if package.json is missing', async () => {
      await expect(
        resolveSource({ type: 'local', path: tmpDir }, { cwd: process.cwd() }),
      ).rejects.toThrow(/No package.json found/);
    });

    it('throws if caesar manifest is missing', async () => {
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
      await expect(
        resolveSource({ type: 'local', path: tmpDir }, { cwd: process.cwd() }),
      ).rejects.toThrow(/missing "caesar" manifest field/);
    });
  });
});
