import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOOL_TARGETS } from '@caesar/agents-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeTmpDir, realRepoRoot, removeDir } from '../test-support/tmp-agent-repo.js';
import { runBuild } from './build-command.js';

// build integration: drive runBuild over the REAL cat-01 sources, writing to a tmp out dir.
// Proves every target produces output (success criterion) without touching the repo's dist/.

describe('runBuild', () => {
  let out: string;
  const root = realRepoRoot();

  beforeEach(() => {
    out = makeTmpDir('caesar-cli-build-');
  });
  afterEach(() => {
    removeDir(out);
  });

  it('writes output for all configured targets from canonical cat-01 sources', () => {
    const result = runBuild({ out, root, category: ['01'] });

    expect(result.parseFailures).toEqual([]);
    expect(result.agentCount).toBeGreaterThanOrEqual(7);
    expect(result.tools).toEqual([...TOOL_TARGETS]);
    expect(result.skipped).toEqual([]);

    // Each native tool emits one file per agent; agents-md emits a single aggregate index.
    for (const tool of TOOL_TARGETS) {
      const written = result.writtenByTool[tool] ?? [];
      expect(written.length, `tool ${tool} should have output`).toBeGreaterThan(0);
      for (const abs of written) expect(existsSync(abs)).toBe(true);
    }
    const agentsMd = result.writtenByTool['agents-md'] ?? [];
    expect(agentsMd.length).toBe(1);
    expect(result.writtenByTool.claude?.length).toBe(result.agentCount);
  });

  it('writes claude per-agent .md files under <out>/claude/.claude/agents', () => {
    runBuild({ out, root, tool: ['claude'], category: ['01'] });
    const agentsDir = join(out, 'claude', '.claude', 'agents');
    expect(existsSync(agentsDir)).toBe(true);
    const files = readdirSync(agentsDir);
    expect(files).toContain('api-designer.md');
    expect(files.every((f) => f.endsWith('.md'))).toBe(true);
  });

  it('restricts output to the requested tool only', () => {
    const result = runBuild({ out, root, tool: ['kiro'], category: ['01'] });
    expect(result.tools).toEqual(['kiro']);
    expect(existsSync(join(out, 'kiro'))).toBe(true);
    expect(existsSync(join(out, 'claude'))).toBe(false);
  });

  it('passes --model-provider through to provider/model-id tools (opencode)', () => {
    const result = runBuild({
      out,
      root,
      tool: ['opencode'],
      category: ['01'],
      modelProvider: 'openrouter',
    });
    const written = result.writtenByTool.opencode ?? [];
    expect(written.length).toBeGreaterThan(0);
    // The provider prefix only appears for non-inherit model tiers; assert at least one file carries it.
    const contents = written.map((p) => readFileSync(p, 'utf8'));
    expect(contents.some((c) => c.includes('openrouter/'))).toBe(true);
  });

  it('throws a usage error for an unknown --tool', () => {
    expect(() => runBuild({ out, root, tool: ['notatool'] })).toThrow(/Unknown tool/);
  });

  it('throws a usage error for an unknown --category', () => {
    expect(() => runBuild({ out, root, category: ['99'] })).toThrow(/No agents match category/);
  });
});
