import { describe, expect, it } from 'vitest';
import { claudeEmitter } from '../emitters/adapters/claude/claude-emitter.js';
import { opencodeEmitter } from '../emitters/adapters/pilot/opencode-emitter.js';
import {
  buildAgent,
  fullPermissionAgent,
  readOnlyAgent,
} from '../emitters/adapters/pilot/pilot-emitter-test-fixtures.js';
import type { EmitContext } from '../emitters/core/emitter-interface.js';
import { smokeTest } from './markdown-agent-smoke-test.js';

const ctx: EmitContext = { distRoot: '/tmp/dist' };

describe('smokeTest', () => {
  it('passes on a real claude emitted file', () => {
    const { content } = claudeEmitter(buildAgent(), ctx);
    expect(smokeTest(content, { requiredFields: ['name', 'description'] })).toEqual({
      ok: true,
      errors: [],
    });
  });

  it('passes on a real opencode emitted file', () => {
    const { content } = opencodeEmitter(fullPermissionAgent(), ctx);
    expect(smokeTest(content, { requiredFields: ['description'] })).toEqual({
      ok: true,
      errors: [],
    });
  });

  it('passes on read-only emitted files for both tools', () => {
    expect(smokeTest(claudeEmitter(readOnlyAgent(), ctx).content).ok).toBe(true);
    expect(smokeTest(opencodeEmitter(readOnlyAgent(), ctx).content).ok).toBe(true);
  });

  it('flags missing body sections', () => {
    const { content } = claudeEmitter(buildAgent({}, '## Role & Expertise\nonly one section'), ctx);
    const result = smokeTest(content);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('missing required sections'))).toBe(true);
  });

  it('flags out-of-order body sections', () => {
    const reordered = [
      '## When to Use',
      'wrong first',
      '## Role & Expertise',
      'second',
      '## Workflow',
      'x',
      '## Checklist & Heuristics',
      'x',
      '## Output Contract',
      'x',
      '## Boundaries',
      'x',
    ].join('\n');
    const { content } = claudeEmitter(buildAgent({}, reordered), ctx);
    const result = smokeTest(content);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('body sections are out of canonical order');
  });

  it('flags an empty required field', () => {
    const file = '---\ndescription: ""\nmode: subagent\n---\n\nbody';
    const result = smokeTest(file, { requiredFields: ['description'] });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('required frontmatter field "description" is empty');
  });

  it('flags missing frontmatter', () => {
    const result = smokeTest('# just a body, no frontmatter');
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('frontmatter is missing or empty');
  });

  it('flags an empty body', () => {
    const result = smokeTest('---\nname: x\n---\n');
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('body is empty');
  });
});
