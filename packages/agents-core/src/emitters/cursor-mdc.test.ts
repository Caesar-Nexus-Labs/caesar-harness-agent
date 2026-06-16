import { describe, expect, it } from 'vitest';
import { cursorMdcEmitter } from './cursor-mdc.js';
import type { EmitContext } from './emitter-interface.js';
import { buildAgent, fullPermissionAgent, readOnlyAgent } from './pilot-emitter-test-fixtures.js';

const ctx: EmitContext = { distRoot: '/tmp/dist' };

describe('cursorMdcEmitter', () => {
  it('emits to .cursor/rules/{slug}.mdc', () => {
    const agent = buildAgent();
    const file = cursorMdcEmitter(agent, ctx);
    expect(file.tool).toBe('cursor');
    expect(file.relativePath).toBe(`.cursor/rules/${agent.slug}.mdc`);
  });

  it('content starts with YAML frontmatter (--- block)', () => {
    const file = cursorMdcEmitter(buildAgent(), ctx);
    expect(file.content.startsWith('---\n')).toBe(true);
  });

  it('frontmatter includes description and alwaysApply: false', () => {
    const agent = buildAgent();
    const file = cursorMdcEmitter(agent, ctx);
    expect(file.content).toContain('alwaysApply: false');
    expect(file.content).toContain(agent.frontmatter.description.trim());
  });

  it('does NOT have duplicate frontmatter — body has no leading --- block', () => {
    // The source markdown frontmatter is stripped by the loader; body contains only prompt.
    // The emitter must NOT re-emit any --- block from the body.
    const agent = buildAgent();
    const file = cursorMdcEmitter(agent, ctx);
    const content = file.content;

    // Find closing --- of the frontmatter block.
    const firstClose = content.indexOf('---\n', 4); // skip opening ---
    const afterFrontmatter = content.slice(firstClose + 4); // after the closing ---\n

    // The rest of the content must NOT start with another frontmatter block.
    expect(afterFrontmatter.trimStart().startsWith('---')).toBe(false);
  });

  it('body content appears after frontmatter block', () => {
    const agent = buildAgent();
    const file = cursorMdcEmitter(agent, ctx);

    // The body should contain the agent role section.
    expect(file.content).toContain('## Role & Expertise');
    expect(file.content).toContain('## Workflow');
  });

  it('body is normalized — no CRLF sequences', () => {
    const agent = buildAgent(
      {},
      '## Role & Expertise\r\nTest agent.\r\n\r\n## When to Use\r\nAlways.\r\n\r\n## Workflow\r\nStep 1.\r\n\r\n## Checklist & Heuristics\r\n- One.\r\n\r\n## Output Contract\r\nDone.\r\n\r\n## Boundaries\r\nNone.',
    );
    const file = cursorMdcEmitter(agent, ctx);
    expect(file.content).not.toContain('\r\n');
  });

  it('per-agent output: each agent gets its own .mdc file', () => {
    const a1 = buildAgent({ name: 'code-reviewer' });
    const a2 = buildAgent({ name: 'test-writer' });
    const f1 = cursorMdcEmitter(a1, ctx);
    const f2 = cursorMdcEmitter(a2, ctx);
    expect(f1.relativePath).toBe('.cursor/rules/code-reviewer.mdc');
    expect(f2.relativePath).toBe('.cursor/rules/test-writer.mdc');
  });

  it('read-only agent path is correct', () => {
    const agent = readOnlyAgent();
    const file = cursorMdcEmitter(agent, ctx);
    expect(file.relativePath).toBe(`.cursor/rules/${agent.slug}.mdc`);
  });

  it('full-permission agent includes description in frontmatter', () => {
    const agent = fullPermissionAgent();
    const file = cursorMdcEmitter(agent, ctx);
    expect(file.content).toContain(agent.frontmatter.description.trim());
  });

  it('globs are emitted when language hints are detected in description', () => {
    const agent = buildAgent({
      name: 'typescript-specialist',
      description: 'TypeScript specialist for type-safe development and migration.',
      when_to_use: 'Use when working on TypeScript files.',
    });
    const file = cursorMdcEmitter(agent, ctx);
    // TypeScript hint → should include .ts and .tsx globs
    expect(file.content).toContain('**/*.ts');
  });

  it('no globs for generic agent without language hints', () => {
    const agent = buildAgent({
      description: 'Expert code reviewer for quality and maintainability across all files.',
    });
    const file = cursorMdcEmitter(agent, ctx);
    // No language-specific hints → globs field should be absent
    expect(file.content).not.toContain('globs:');
  });

  it('snapshot', () => {
    expect(cursorMdcEmitter(buildAgent(), ctx).content).toMatchSnapshot();
  });
});
