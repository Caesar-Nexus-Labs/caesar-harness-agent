import { describe, expect, it } from 'vitest';
import { codexEmitter } from '../emitters/adapters/pilot/codex-emitter.js';
import { kiloEmitter } from '../emitters/adapters/pilot/kilo-emitter.js';
import { kiroEmitter } from '../emitters/adapters/pilot/kiro-emitter.js';
import {
  buildAgent,
  fullPermissionAgent,
  readOnlyAgent,
} from '../emitters/adapters/pilot/pilot-emitter-test-fixtures.js';
import type { EmitContext } from '../emitters/core/emitter-interface.js';
import { structuredSmokeTest } from './structured-agent-smoke-test.js';

const ctx: EmitContext = { distRoot: '/tmp/dist' };

describe('structuredSmokeTest — kiro JSON', () => {
  it('passes on a real kiro emitted file', () => {
    const { content } = kiroEmitter(buildAgent(), ctx);
    expect(
      structuredSmokeTest(content, {
        format: 'json',
        requiredFields: ['name', 'description', 'prompt'],
        bodyField: 'prompt',
      }),
    ).toEqual({ ok: true, errors: [] });
  });

  it('passes on read-only + full kiro files', () => {
    for (const agent of [readOnlyAgent(), fullPermissionAgent()]) {
      const { content } = kiroEmitter(agent, ctx);
      expect(structuredSmokeTest(content, { format: 'json', bodyField: 'prompt' }).ok).toBe(true);
    }
  });

  it('flags malformed JSON', () => {
    const result = structuredSmokeTest('{ not valid json', { format: 'json' });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('failed to re-parse json');
  });

  it('flags a missing required field', () => {
    const result = structuredSmokeTest('{"name":"x"}', {
      format: 'json',
      requiredFields: ['description'],
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('required field "description" is empty');
  });

  it('flags a prompt body missing the 6 sections', () => {
    const result = structuredSmokeTest('{"prompt":"## Role & Expertise\\nonly one"}', {
      format: 'json',
      bodyField: 'prompt',
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('missing required sections'))).toBe(true);
  });
});

describe('structuredSmokeTest — codex TOML', () => {
  it('passes on a real codex emitted file', () => {
    const { content } = codexEmitter(buildAgent(), ctx);
    expect(
      structuredSmokeTest(content, {
        format: 'toml',
        requiredFields: ['name', 'description', 'developer_instructions'],
        bodyField: 'developer_instructions',
      }),
    ).toEqual({ ok: true, errors: [] });
  });

  it('passes on read-only + full codex files', () => {
    for (const agent of [readOnlyAgent(), fullPermissionAgent()]) {
      const { content } = codexEmitter(agent, ctx);
      expect(
        structuredSmokeTest(content, { format: 'toml', bodyField: 'developer_instructions' }).ok,
      ).toBe(true);
    }
  });

  it('flags malformed TOML', () => {
    const result = structuredSmokeTest('name = = "broken"', { format: 'toml' });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('failed to re-parse toml');
  });
});

describe('structuredSmokeTest — kilo YAML (aggregate)', () => {
  it('round-trips a real .kilocodemodes file (customModes is a non-empty array)', () => {
    const { content } = kiloEmitter([buildAgent(), readOnlyAgent(), fullPermissionAgent()], ctx);
    expect(structuredSmokeTest(content, { format: 'yaml', arrayField: 'customModes' })).toEqual({
      ok: true,
      errors: [],
    });
  });

  it('flags an empty customModes array', () => {
    const result = structuredSmokeTest('customModes: []\n', {
      format: 'yaml',
      arrayField: 'customModes',
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('array field "customModes" is missing or empty');
  });

  it('flags malformed YAML', () => {
    const result = structuredSmokeTest('customModes:\n  - : :\n', { format: 'yaml' });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('failed to re-parse yaml');
  });
});
