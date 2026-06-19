import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import type { EmitContext } from '../../core/emitter-interface.js';
import {
  agentWithReasoningEffort,
  buildAgent,
  fullPermissionAgent,
  readOnlyAgent,
} from '../pilot/pilot-emitter-test-fixtures.js';
import { copilotEmitter } from './copilot-emitter.js';

const ctx: EmitContext = { distRoot: '/tmp/dist' };

describe('copilotEmitter', () => {
  it('emits read-only agent (snapshot)', () => {
    expect(copilotEmitter(readOnlyAgent(), ctx).content).toMatchSnapshot();
  });

  it('emits full-permission agent (snapshot)', () => {
    expect(copilotEmitter(fullPermissionAgent(), ctx).content).toMatchSnapshot();
  });

  it('emits edit-tier agent (snapshot)', () => {
    expect(copilotEmitter(agentWithReasoningEffort(), ctx).content).toMatchSnapshot();
  });

  it('writes to .github/agents/{slug}.agent.md', () => {
    const file = copilotEmitter(buildAgent(), ctx);
    expect(file.tool).toBe('copilot');
    expect(file.relativePath).toBe('.github/agents/code-reviewer.agent.md');
  });

  it('OMITS target + handoffs (both envs, no v1 inter-agent wiring)', () => {
    for (const agent of [readOnlyAgent(), fullPermissionAgent(), buildAgent()]) {
      const { data } = matter(copilotEmitter(agent, ctx).content);
      expect('target' in data).toBe(false);
      expect('handoffs' in data).toBe(false);
    }
  });

  it('frontmatter carries name, description + tools as a YAML array', () => {
    const { data, content } = matter(copilotEmitter(buildAgent(), ctx).content);
    expect(data.name).toBe('code-reviewer');
    expect(typeof data.description).toBe('string');
    expect(Array.isArray(data.tools)).toBe(true);
    expect(content).toContain('## Role & Expertise');
  });

  it('read-only agent restricted to read/search aliases (no edit/execute)', () => {
    const { data } = matter(copilotEmitter(readOnlyAgent(), ctx).content);
    expect(data.tools).toEqual(['read', 'search']);
  });

  it('full-permission agent maps to documented aliases', () => {
    const { data } = matter(copilotEmitter(fullPermissionAgent(), ctx).content);
    // fixture tools: read, grep, glob, edit, write, bash → read, search, edit, execute (no web).
    expect(data.tools).toEqual(['read', 'search', 'edit', 'execute']);
  });

  it('maps model tier → id; inherit omits model', () => {
    const top = matter(copilotEmitter(agentWithReasoningEffort(), ctx).content).data;
    expect(top.model).toBe('gpt-5.5');
    const inheritAgent = matter(copilotEmitter(readOnlyAgent(), ctx).content).data;
    expect('model' in inheritAgent).toBe(false);
  });
});
