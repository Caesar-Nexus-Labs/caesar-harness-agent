import matter from 'gray-matter';
import { afterEach, describe, expect, it } from 'vitest';
import { transpile } from '../../transpile.js';
import { claudeOutputValidator } from '../../validation/claude-output-validator.js';
import { opencodeOutputValidator } from '../../validation/opencode-output-validator.js';
import {
  clearOutputValidators,
  getOutputValidator,
  hasOutputValidator,
} from '../../validation/output-validator-interface.js';
import { claudeEmitter } from '../adapters/claude/claude-emitter.js';
import { opencodeEmitter } from '../adapters/pilot/opencode-emitter.js';
import {
  agentWithWhenToUseAndExamples,
  buildAgent,
  fullPermissionAgent,
  readOnlyAgent,
} from '../adapters/pilot/pilot-emitter-test-fixtures.js';
import { clearEmitters, getEmitter, hasEmitter } from '../core/emitter-interface.js';
import { registerPilotEmitters } from './register-pilot-emitters.js';

const ctx = { distRoot: '/tmp/dist' };

afterEach(() => {
  clearEmitters();
  clearOutputValidators();
});

describe('pilot emitters round-trip (emit → re-parse → fields map back)', () => {
  it('claude frontmatter parses back to the source mapping', () => {
    const agent = fullPermissionAgent();
    const { data } = matter(claudeEmitter(agent, ctx).content);
    expect(data.name).toBe(agent.slug);
    expect(data.model).toBe('opus'); // top → opus
    expect(data.permissionMode).toBe('default'); // full → default
    expect(data.tools).toBe('Read, Grep, Glob, Edit, Write, Bash');
    expect(data.color).toBe('green');
  });

  it('claude read-only round-trip never carries mutating tools', () => {
    const { data } = matter(claudeEmitter(readOnlyAgent(), ctx).content);
    expect(data.permissionMode).toBe('plan');
    expect(data.tools).toBe('Read, Grep, Glob');
    expect(data.model).toBe('inherit');
  });

  it('claude description round-trips with folded when_to_use + triggers', () => {
    const { data } = matter(claudeEmitter(agentWithWhenToUseAndExamples(), ctx).content);
    expect(data.description).toContain('Use when:');
    expect(data.description).toContain('add tests for the /users endpoint');
  });

  it('opencode frontmatter parses back to the source mapping', () => {
    const agent = buildAgent({ permission: 'edit', model: 'balanced' });
    const { data } = matter(opencodeEmitter(agent, ctx).content);
    expect(data.description).toBe(agent.frontmatter.description);
    expect(data.mode).toBe('subagent');
    expect(data.model).toBe('anthropic/claude-sonnet-4-20250514');
    expect(data.permission).toEqual({ edit: 'allow', bash: 'ask' });
  });

  it('opencode inherit omits model on round-trip', () => {
    const { data } = matter(opencodeEmitter(readOnlyAgent(), ctx).content);
    expect(data.model).toBeUndefined();
    expect(data.permission).toEqual({ edit: 'deny', bash: 'deny' });
  });
});

describe('output validators on emitted content', () => {
  it('claude validator accepts valid emitted output', () => {
    expect(claudeOutputValidator(claudeEmitter(readOnlyAgent(), ctx).content).ok).toBe(true);
    expect(claudeOutputValidator(claudeEmitter(fullPermissionAgent(), ctx).content).ok).toBe(true);
  });

  it('claude validator rejects a read-only agent that leaks a mutating tool', () => {
    const malformed =
      '---\nname: bad\ndescription: leaks tools\ntools: Read, Edit\nmodel: inherit\npermissionMode: plan\n---\n\nbody';
    const result = claudeOutputValidator(malformed);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('mutating tools');
  });

  it('opencode validator accepts valid emitted output', () => {
    expect(opencodeOutputValidator(opencodeEmitter(readOnlyAgent(), ctx).content).ok).toBe(true);
    expect(opencodeOutputValidator(opencodeEmitter(fullPermissionAgent(), ctx).content).ok).toBe(
      true,
    );
  });

  it('opencode validator rejects an incoherent permission block', () => {
    const malformed =
      '---\ndescription: incoherent\nmode: subagent\npermission:\n  edit: deny\n  bash: allow\n---\n\nbody';
    const result = opencodeOutputValidator(malformed);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('incoherent permission block');
  });
});

describe('registerPilotEmitters wires the Phase 03 registries', () => {
  it('registers both emitters + validators and transpiles end-to-end', () => {
    registerPilotEmitters();
    expect(hasEmitter('claude')).toBe(true);
    expect(hasEmitter('opencode')).toBe(true);
    expect(getEmitter('claude')).toBe(claudeEmitter);
    expect(getEmitter('opencode')).toBe(opencodeEmitter);
    expect(hasOutputValidator('claude')).toBe(true);
    expect(hasOutputValidator('opencode')).toBe(true);
    expect(getOutputValidator('claude')).toBe(claudeOutputValidator);

    const result = transpile(buildAgent(), ['claude', 'opencode'], ctx);
    expect(result.files.map((f) => f.tool)).toEqual(['claude', 'opencode']);
    expect(result.validationErrors).toEqual([]);
    expect(result.files[0]?.relativePath).toBe('.claude/agents/code-reviewer.md');
    expect(result.files[1]?.relativePath).toBe('.opencode/agents/code-reviewer.md');
  });
});
