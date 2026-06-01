import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import type { EmitContext } from './emitter-interface.js';
import { openhandsEmitter } from './openhands-emitter.js';
import {
  agentWithWhenToUseAndExamples,
  buildAgent,
  fullPermissionAgent,
  readOnlyAgent,
} from './pilot-emitter-test-fixtures.js';

// OpenHands emitter: per-agent `.agents/skills/{slug}/SKILL.md`, inherit-only (name+description).
// NO triggers (schema has no keywords field), NO tools/model/permission.

const ctx: EmitContext = { distRoot: '/tmp/dist' };

describe('openhandsEmitter', () => {
  it('emits read-only agent (snapshot)', () => {
    expect(openhandsEmitter(readOnlyAgent(), ctx).content).toMatchSnapshot();
  });

  it('emits full-permission agent (snapshot)', () => {
    expect(openhandsEmitter(fullPermissionAgent(), ctx).content).toMatchSnapshot();
  });

  it('writes to nested .agents/skills/{slug}/SKILL.md', () => {
    const file = openhandsEmitter(buildAgent(), ctx);
    expect(file.tool).toBe('openhands');
    expect(file.relativePath).toBe('.agents/skills/code-reviewer/SKILL.md');
  });

  it('frontmatter carries name + description only — NO triggers/tools/model', () => {
    for (const agent of [readOnlyAgent(), fullPermissionAgent(), buildAgent()]) {
      const { data, content } = matter(openhandsEmitter(agent, ctx).content);
      expect(data.name).toBe(agent.slug);
      expect(typeof data.description).toBe('string');
      expect((data.description as string).length).toBeGreaterThan(0);
      expect('triggers' in data).toBe(false);
      expect('tools' in data).toBe(false);
      expect('model' in data).toBe(false);
      expect('permission' in data).toBe(false);
      expect(content).toContain('## Role & Expertise');
    }
  });

  it('prefers when_to_use for the description when present', () => {
    const { data } = matter(openhandsEmitter(agentWithWhenToUseAndExamples(), ctx).content);
    expect(data.description).toContain('Invoke after a feature lands');
  });
});
