import { parse as parseToml } from '@iarna/toml';
import { describe, expect, it } from 'vitest';
import type { EmitContext } from '../../core/emitter-interface.js';
import { codexEmitter } from './codex-emitter.js';
import {
  agentWithReasoningEffort,
  buildAgent,
  fullPermissionAgent,
  readOnlyAgent,
} from './pilot-emitter-test-fixtures.js';

const ctx: EmitContext = { distRoot: '/tmp/dist' };

describe('codexEmitter', () => {
  it('emits read-only agent (snapshot)', () => {
    expect(codexEmitter(readOnlyAgent(), ctx).content).toMatchSnapshot();
  });

  it('emits full-permission agent (snapshot)', () => {
    expect(codexEmitter(fullPermissionAgent(), ctx).content).toMatchSnapshot();
  });

  it('emits reasoning-effort agent (snapshot)', () => {
    expect(codexEmitter(agentWithReasoningEffort(), ctx).content).toMatchSnapshot();
  });

  it('writes to .codex/agents/{slug}.toml', () => {
    const file = codexEmitter(buildAgent(), ctx);
    expect(file.tool).toBe('codex');
    expect(file.relativePath).toBe('.codex/agents/code-reviewer.toml');
  });

  it('NEVER emits a tools field (sandbox-only contract)', () => {
    for (const agent of [readOnlyAgent(), fullPermissionAgent(), agentWithReasoningEffort()]) {
      const parsed = parseToml(codexEmitter(agent, ctx).content);
      expect('tools' in parsed).toBe(false);
    }
  });

  it('carries the 3 required keys (name, description, developer_instructions)', () => {
    const parsed = parseToml(codexEmitter(buildAgent(), ctx).content) as Record<string, unknown>;
    expect(parsed.name).toBe('code-reviewer');
    expect(typeof parsed.description).toBe('string');
    expect(parsed.developer_instructions).toContain('## Role & Expertise');
  });

  it('maps permission → sandbox_mode (read-only → read-only; full → workspace-write)', () => {
    const ro = parseToml(codexEmitter(readOnlyAgent(), ctx).content) as Record<string, unknown>;
    expect(ro.sandbox_mode).toBe('read-only');
    const full = parseToml(codexEmitter(fullPermissionAgent(), ctx).content) as Record<
      string,
      unknown
    >;
    expect(full.sandbox_mode).toBe('workspace-write');
  });

  it('maps model tier → gpt id; inherit omits model', () => {
    const top = parseToml(codexEmitter(agentWithReasoningEffort(), ctx).content) as Record<
      string,
      unknown
    >;
    expect(top.model).toBe('gpt-5.5'); // top → gpt-5.5
    expect(top.model_reasoning_effort).toBe('high');
    const inheritAgent = parseToml(codexEmitter(readOnlyAgent(), ctx).content) as Record<
      string,
      unknown
    >;
    expect('model' in inheritAgent).toBe(false); // inherit → omit
    expect('model_reasoning_effort' in inheritAgent).toBe(false); // no reasoning_effort → omit
  });
});
