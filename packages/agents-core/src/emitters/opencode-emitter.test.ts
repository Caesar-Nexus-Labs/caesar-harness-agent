import { describe, expect, it } from 'vitest';
import type { EmitContext } from './emitter-interface.js';
import { opencodeEmitter } from './opencode-emitter.js';
import {
  agentWithWhenToUseAndExamples,
  buildAgent,
  fullPermissionAgent,
  readOnlyAgent,
} from './pilot-emitter-test-fixtures.js';

const ctx: EmitContext = { distRoot: '/tmp/dist' };

describe('opencodeEmitter', () => {
  it('emits read-only agent (snapshot)', () => {
    expect(opencodeEmitter(readOnlyAgent(), ctx).content).toMatchSnapshot();
  });

  it('emits full-permission agent (snapshot)', () => {
    expect(opencodeEmitter(fullPermissionAgent(), ctx).content).toMatchSnapshot();
  });

  it('emits edit-tier agent (snapshot)', () => {
    expect(opencodeEmitter(agentWithWhenToUseAndExamples(), ctx).content).toMatchSnapshot();
  });

  it('writes to .opencode/agents/{slug}.md', () => {
    const file = opencodeEmitter(buildAgent(), ctx);
    expect(file.tool).toBe('opencode');
    expect(file.relativePath).toBe('.opencode/agents/code-reviewer.md');
  });

  it('always sets mode: subagent', () => {
    expect(opencodeEmitter(buildAgent(), ctx).content).toContain('mode: subagent');
  });

  it('read-only → permission edit:deny, bash:deny', () => {
    const content = opencodeEmitter(buildAgent({ permission: 'read-only' }), ctx).content;
    expect(content).toContain('edit: deny');
    expect(content).toContain('bash: deny');
  });

  it('edit → permission edit:allow, bash:ask', () => {
    const content = opencodeEmitter(buildAgent({ permission: 'edit' }), ctx).content;
    expect(content).toContain('edit: allow');
    expect(content).toContain('bash: ask');
  });

  it('full → permission edit:allow, bash:allow', () => {
    const content = opencodeEmitter(buildAgent({ permission: 'full' }), ctx).content;
    expect(content).toContain('edit: allow');
    expect(content).toContain('bash: allow');
  });

  it('balanced model → provider/model-id; inherit → omits model', () => {
    expect(opencodeEmitter(buildAgent({ model: 'balanced' }), ctx).content).toContain(
      'model: anthropic/claude-sonnet-4-20250514',
    );
    expect(opencodeEmitter(buildAgent({ model: 'inherit' }), ctx).content).not.toContain('model:');
  });

  it('never emits temperature (no canonical field)', () => {
    expect(opencodeEmitter(buildAgent(), ctx).content).not.toContain('temperature');
  });

  it('respects modelProvider + modelOverrides from EmitContext (W3)', () => {
    const content = opencodeEmitter(buildAgent({ model: 'balanced' }), {
      distRoot: '/tmp/dist',
      modelProvider: 'openrouter',
    }).content;
    expect(content).toContain('model: openrouter/claude-sonnet-4-20250514');
  });
});
