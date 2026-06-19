import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import type { EmitContext } from '../../core/emitter-interface.js';
import { factoryEmitter } from './factory-emitter.js';
import {
  agentWithReasoningEffort,
  buildAgent,
  fullPermissionAgent,
  readOnlyAgent,
} from './pilot-emitter-test-fixtures.js';

const ctx: EmitContext = { distRoot: '/tmp/dist' };

describe('factoryEmitter', () => {
  it('emits read-only agent (snapshot)', () => {
    expect(factoryEmitter(readOnlyAgent(), ctx).content).toMatchSnapshot();
  });

  it('emits full-permission agent (snapshot)', () => {
    expect(factoryEmitter(fullPermissionAgent(), ctx).content).toMatchSnapshot();
  });

  it('emits reasoning-effort agent (snapshot)', () => {
    expect(factoryEmitter(agentWithReasoningEffort(), ctx).content).toMatchSnapshot();
  });

  it('writes to .factory/droids/{slug}.md', () => {
    const file = factoryEmitter(buildAgent(), ctx);
    expect(file.tool).toBe('factory');
    expect(file.relativePath).toBe('.factory/droids/code-reviewer.md');
  });

  it('frontmatter parses + carries name, description, model', () => {
    const { data, content } = matter(factoryEmitter(buildAgent(), ctx).content);
    expect(data.name).toBe('code-reviewer');
    expect(typeof data.description).toBe('string');
    expect(data.model).toBeDefined();
    expect(content).toContain('## Role & Expertise');
  });

  it('read-only → tools category read-only; full → tools omitted (grants all)', () => {
    const ro = matter(factoryEmitter(readOnlyAgent(), ctx).content).data;
    expect(ro.tools).toBe('read-only');
    const full = matter(factoryEmitter(fullPermissionAgent(), ctx).content).data;
    expect('tools' in full).toBe(false);
  });

  it('emits reasoningEffort (camelCase) from reasoning_effort; omits when absent', () => {
    const withEffort = matter(factoryEmitter(agentWithReasoningEffort(), ctx).content).data;
    expect(withEffort.reasoningEffort).toBe('high');
    const without = matter(factoryEmitter(buildAgent(), ctx).content).data;
    expect('reasoningEffort' in without).toBe(false);
  });

  it('inherit model emits literal `inherit`', () => {
    const data = matter(factoryEmitter(readOnlyAgent(), ctx).content).data;
    expect(data.model).toBe('inherit');
  });

  it('never emits a color field (not in Factory droid schema)', () => {
    // fullPermissionAgent + reasoning fixture both carry color; emitter must drop it.
    expect('color' in matter(factoryEmitter(fullPermissionAgent(), ctx).content).data).toBe(false);
    expect('color' in matter(factoryEmitter(agentWithReasoningEffort(), ctx).content).data).toBe(
      false,
    );
  });
});
