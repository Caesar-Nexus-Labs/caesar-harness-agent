import { describe, expect, it } from 'vitest';
import { claudeEmitter } from './claude-emitter.js';
import type { EmitContext } from './emitter-interface.js';
import {
  agentWithWhenToUseAndExamples,
  buildAgent,
  fullPermissionAgent,
  readOnlyAgent,
} from './pilot-emitter-test-fixtures.js';

const ctx: EmitContext = { distRoot: '/tmp/dist' };

describe('claudeEmitter', () => {
  it('emits read-only agent (snapshot)', () => {
    expect(claudeEmitter(readOnlyAgent(), ctx).content).toMatchSnapshot();
  });

  it('emits full-permission agent with write/bash tools + color (snapshot)', () => {
    expect(claudeEmitter(fullPermissionAgent(), ctx).content).toMatchSnapshot();
  });

  it('folds when_to_use + example triggers into description (snapshot)', () => {
    expect(claudeEmitter(agentWithWhenToUseAndExamples(), ctx).content).toMatchSnapshot();
  });

  it('writes to .claude/agents/{slug}.md', () => {
    const file = claudeEmitter(buildAgent(), ctx);
    expect(file.tool).toBe('claude');
    expect(file.relativePath).toBe('.claude/agents/code-reviewer.md');
  });

  it('read-only agent maps model `balanced`→sonnet, permissionMode→plan, omits mutating tools', () => {
    const content = claudeEmitter(
      buildAgent({ permission: 'read-only', model: 'balanced' }),
      ctx,
    ).content;
    expect(content).toContain('model: sonnet');
    expect(content).toContain('permissionMode: plan');
    expect(content).toContain('tools: Read, Grep, Glob');
    expect(content).not.toMatch(/Edit|Write|Bash/);
  });

  it('inherit model emits literal `inherit` (Claude always carries a model field)', () => {
    const content = claudeEmitter(readOnlyAgent(), ctx).content;
    expect(content).toContain('model: inherit');
  });

  it('omits tools allowlist for full-permission agent only when unrestricted', () => {
    // full + explicit tools list → tools ARE emitted (explicit restriction wins).
    const content = claudeEmitter(fullPermissionAgent(), ctx).content;
    expect(content).toContain('tools: Read, Grep, Glob, Edit, Write, Bash');
    expect(content).toContain('permissionMode: default');
    expect(content).toContain('color: green');
  });

  it('respects modelOverrides from EmitContext (W3) without changing the emitter', () => {
    const content = claudeEmitter(buildAgent({ model: 'top' }), {
      distRoot: '/tmp/dist',
      modelOverrides: { top: { claude: 'opus-custom' } },
    }).content;
    expect(content).toContain('model: opus-custom');
  });
});
