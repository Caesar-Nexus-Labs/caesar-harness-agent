import { describe, expect, it } from 'vitest';
import { clineRuleEmitter } from './opt-in-rules/cline-rule-emitter.js';
import { cursorRuleEmitter } from './opt-in-rules/cursor-rule-emitter.js';
import { WINDSURF_MAX_CHARS, windsurfRuleEmitter } from './opt-in-rules/windsurf-rule-emitter.js';
import { buildAgent, SIX_SECTION_BODY } from './pilot-emitter-test-fixtures.js';

// Opt-in per-tool rule emitters (Cursor `.mdc`, Windsurf, Cline). These are NOT wired into
// the typed transpile registry — they are explicitly invoked by a caller (Phase 08 CLI flag).

describe('cursorRuleEmitter', () => {
  it('emits .cursor/rules/{name}.mdc with alwaysApply:false + description', () => {
    const file = cursorRuleEmitter(buildAgent({ name: 'backend-developer' }));
    expect(file.relativePath).toBe('.cursor/rules/backend-developer.mdc');
    expect(file.content).toContain('alwaysApply: false');
    expect(file.content).toMatch(/^---\n/);
    expect(file.content).toContain('description:');
    expect(file.content).toContain('## Role & Expertise');
    expect(file.warnings).toEqual([]);
  });

  it('includes globs only when provided', () => {
    const without = cursorRuleEmitter(buildAgent());
    expect(without.content).not.toContain('globs:');
    const withGlobs = cursorRuleEmitter(buildAgent(), { globs: ['src/**/*.ts'] });
    expect(withGlobs.content).toContain('globs:');
    expect(withGlobs.content).toContain('src/**/*.ts');
  });
});

describe('windsurfRuleEmitter', () => {
  it('emits .windsurf/rules/{name}.md with trigger:model_decision', () => {
    const file = windsurfRuleEmitter(buildAgent({ name: 'api-designer' }));
    expect(file.relativePath).toBe('.windsurf/rules/api-designer.md');
    expect(file.content).toContain('trigger: model_decision');
    expect(file.content).toContain('description:');
    expect(file.warnings).toEqual([]);
  });

  it('leaves a short body intact (no truncation, no warning)', () => {
    const file = windsurfRuleEmitter(buildAgent());
    expect(file.content).toContain('## Boundaries');
    expect(file.content.length).toBeLessThanOrEqual(WINDSURF_MAX_CHARS);
    expect(file.warnings).toEqual([]);
  });

  it('truncates a >12k-char body and stays within the limit (warns)', () => {
    // Build a body well over 12k chars by padding the Workflow section.
    const longParagraphs = Array.from(
      { length: 400 },
      (_, i) => `Step ${i}: perform a detailed and lengthy implementation action here.`,
    ).join('\n\n');
    const longBody = SIX_SECTION_BODY.replace(
      '1. Read the diff. 2. Flag issues. 3. Report.',
      longParagraphs,
    );
    expect(longBody.length).toBeGreaterThan(WINDSURF_MAX_CHARS);

    const file = windsurfRuleEmitter(buildAgent({ name: 'long-agent' }, longBody));
    expect(file.content.length).toBeLessThanOrEqual(WINDSURF_MAX_CHARS);
    expect(file.warnings.length).toBe(1);
    expect(file.warnings[0]).toContain('truncated');
    expect(file.content).toContain('truncated to fit the Windsurf');
    // Frontmatter survives truncation.
    expect(file.content).toContain('trigger: model_decision');
  });
});

describe('clineRuleEmitter', () => {
  it('emits .clinerules/{NN}-{name}.md with zero-padded order prefix', () => {
    const file = clineRuleEmitter(buildAgent({ name: 'frontend-developer' }), { order: 3 });
    expect(file.relativePath).toBe('.clinerules/03-frontend-developer.md');
    expect(file.content).toContain('## Role & Expertise');
    expect(file.warnings).toEqual([]);
  });

  it('defaults to order 01 and emits no frontmatter when paths omitted', () => {
    const file = clineRuleEmitter(buildAgent({ name: 'plain' }));
    expect(file.relativePath).toBe('.clinerules/01-plain.md');
    expect(file.content).not.toMatch(/^---\n/);
  });

  it('emits paths frontmatter when provided', () => {
    const file = clineRuleEmitter(buildAgent(), { paths: ['src/api/**'] });
    expect(file.content).toMatch(/^---\n/);
    expect(file.content).toContain('paths:');
    expect(file.content).toContain('src/api/**');
  });
});
