import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import type { EmitContext } from './emitter-interface.js';
import { geminiEmitter } from './gemini-emitter.js';
import { buildAgent, fullPermissionAgent, readOnlyAgent } from './pilot-emitter-test-fixtures.js';

// Gemini CLI emitter: per-agent `.gemini/agents/{slug}.md`, inherit-only (name+description+kind).
// NO tools/model keys (user-locked inherit — dodges unverified Gemini tool-ids).

const ctx: EmitContext = { distRoot: '/tmp/dist' };

describe('geminiEmitter', () => {
  it('emits read-only agent (snapshot)', () => {
    expect(geminiEmitter(readOnlyAgent(), ctx).content).toMatchSnapshot();
  });

  it('emits full-permission agent (snapshot)', () => {
    expect(geminiEmitter(fullPermissionAgent(), ctx).content).toMatchSnapshot();
  });

  it('writes to .gemini/agents/{slug}.md', () => {
    const file = geminiEmitter(buildAgent(), ctx);
    expect(file.tool).toBe('gemini');
    expect(file.relativePath).toBe('.gemini/agents/code-reviewer.md');
  });

  it('frontmatter carries name, description, kind: local — and NO tools/model', () => {
    for (const agent of [readOnlyAgent(), fullPermissionAgent(), buildAgent()]) {
      const { data, content } = matter(geminiEmitter(agent, ctx).content);
      expect(data.name).toBe(agent.slug);
      expect(typeof data.description).toBe('string');
      expect((data.description as string).length).toBeGreaterThan(0);
      expect(data.kind).toBe('local');
      expect('tools' in data).toBe(false);
      expect('model' in data).toBe(false);
      expect(content).toContain('## Role & Expertise');
    }
  });
});
