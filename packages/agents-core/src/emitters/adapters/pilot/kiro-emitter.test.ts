import { describe, expect, it } from 'vitest';
import type { EmitContext } from '../../core/emitter-interface.js';
import { kiroEmitter } from './kiro-emitter.js';
import {
  agentWithReasoningEffort,
  buildAgent,
  fullPermissionAgent,
  readOnlyAgent,
} from './pilot-emitter-test-fixtures.js';

const ctx: EmitContext = { distRoot: '/tmp/dist' };

function parseKiro(content: string): Record<string, unknown> {
  return JSON.parse(content) as Record<string, unknown>;
}

describe('kiroEmitter', () => {
  it('emits read-only agent (snapshot)', () => {
    expect(kiroEmitter(readOnlyAgent(), ctx).content).toMatchSnapshot();
  });

  it('emits full-permission agent (snapshot)', () => {
    expect(kiroEmitter(fullPermissionAgent(), ctx).content).toMatchSnapshot();
  });

  it('emits edit-tier agent (snapshot)', () => {
    expect(kiroEmitter(agentWithReasoningEffort(), ctx).content).toMatchSnapshot();
  });

  it('writes to .kiro/agents/{slug}.json', () => {
    const file = kiroEmitter(buildAgent(), ctx);
    expect(file.tool).toBe('kiro');
    expect(file.relativePath).toBe('.kiro/agents/code-reviewer.json');
  });

  it('produces valid, re-parseable JSON', () => {
    expect(() => parseKiro(kiroEmitter(fullPermissionAgent(), ctx).content)).not.toThrow();
  });

  it('carries name, description, prompt, tools, allowedTools', () => {
    const cfg = parseKiro(kiroEmitter(buildAgent(), ctx).content);
    expect(cfg.name).toBe('code-reviewer');
    expect(typeof cfg.description).toBe('string');
    expect(cfg.prompt).toContain('## Role & Expertise');
    expect(Array.isArray(cfg.tools)).toBe(true);
    expect(Array.isArray(cfg.allowedTools)).toBe(true);
  });

  it('read-only agent: allowedTools never auto-approves write/shell', () => {
    const cfg = parseKiro(kiroEmitter(readOnlyAgent(), ctx).content);
    expect(cfg.tools).toEqual(['read']); // read-only default triad collapses to `read`
    expect(cfg.allowedTools).toEqual(['read']);
  });

  it('full-permission agent: tools include write/shell but allowedTools does not', () => {
    const cfg = parseKiro(kiroEmitter(fullPermissionAgent(), ctx).content);
    expect(cfg.tools).toEqual(['read', 'write', 'shell']);
    expect(cfg.allowedTools).toEqual(['read']); // only read-only-safe tools auto-approved
  });

  it('maps model tier → bare id; inherit omits model', () => {
    const top = parseKiro(kiroEmitter(agentWithReasoningEffort(), ctx).content);
    expect(top.model).toBe('claude-opus-4'); // top → bare id (no provider prefix)
    const inheritAgent = parseKiro(kiroEmitter(readOnlyAgent(), ctx).content);
    expect('model' in inheritAgent).toBe(false);
  });
});
