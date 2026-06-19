import { afterEach, describe, expect, it } from 'vitest';
import {
  clearEmitters,
  type Emitter,
  getEmitter,
  hasEmitter,
  registerEmitter,
  registeredEmitters,
} from './emitters/core/emitter-interface.js';
import type { CanonicalAgent } from './loader/agent-file-loader.js';
import type { ToolTarget } from './mapping/tool-targets.js';
import { TranspileValidationError, transpile } from './transpile.js';
import {
  clearOutputValidators,
  registerOutputValidator,
  validationFailed,
  validationOk,
} from './validation/output-validator-interface.js';

// Build a minimal CanonicalAgent fixture (engine is format-agnostic, so any shape works).
function fixture(overrides: Partial<CanonicalAgent> = {}): CanonicalAgent {
  return {
    frontmatter: {
      name: 'code-reviewer',
      description: 'Expert code review specialist for quality and security checks.',
      category: '01-core-development',
      model: 'balanced',
      permission: 'read-only',
      tools: ['read', 'grep', 'glob'],
    },
    body: '# Role\nbody',
    slug: 'code-reviewer',
    path: '/agents/01-core-development/code-reviewer.md',
    bodyWarnings: [],
    ...overrides,
  };
}

// A stub emitter proves engine + registry + validation WITHOUT real format coupling.
function stubEmitter(tool: ToolTarget): Emitter {
  return (agent, _ctx) => ({
    tool,
    relativePath: `stub/${agent.slug}.txt`,
    content: `${tool}:${agent.slug}`,
  });
}

const ctx = { distRoot: '/tmp/dist' };

afterEach(() => {
  clearEmitters();
  clearOutputValidators();
});

describe('transpile (engine)', () => {
  it('runs each registered emitter and returns one EmittedFile per emitter', () => {
    registerEmitter('claude', stubEmitter('claude'));
    registerEmitter('opencode', stubEmitter('opencode'));

    const result = transpile(fixture(), ['claude', 'opencode'], ctx);

    expect(result.files).toEqual([
      { tool: 'claude', relativePath: 'stub/code-reviewer.txt', content: 'claude:code-reviewer' },
      {
        tool: 'opencode',
        relativePath: 'stub/code-reviewer.txt',
        content: 'opencode:code-reviewer',
      },
    ]);
    expect(result.skipped).toEqual([]);
    expect(result.validationErrors).toEqual([]);
  });

  it('skips requested tools that have no registered emitter (no throw)', () => {
    registerEmitter('claude', stubEmitter('claude'));

    const result = transpile(fixture(), ['claude', 'kiro', 'codex'], ctx);

    expect(result.files.map((f) => f.tool)).toEqual(['claude']);
    expect(result.skipped).toEqual(['kiro', 'codex']);
  });

  it('runs a registered output validator and passes on ok', () => {
    registerEmitter('claude', stubEmitter('claude'));
    registerOutputValidator('claude', () => validationOk());

    const result = transpile(fixture(), ['claude'], ctx);
    expect(result.files).toHaveLength(1);
  });

  it('throws TranspileValidationError when a validator rejects (default)', () => {
    registerEmitter('claude', stubEmitter('claude'));
    registerOutputValidator('claude', () => validationFailed(['bad frontmatter']));

    expect(() => transpile(fixture(), ['claude'], ctx)).toThrow(TranspileValidationError);
  });

  it('collects validation errors instead of throwing when throwOnInvalidOutput=false', () => {
    registerEmitter('claude', stubEmitter('claude'));
    registerOutputValidator('claude', () => validationFailed(['bad frontmatter']));

    const result = transpile(fixture(), ['claude'], ctx, { throwOnInvalidOutput: false });

    expect(result.files).toHaveLength(0);
    expect(result.validationErrors).toEqual([{ tool: 'claude', errors: ['bad frontmatter'] }]);
  });

  it('tools without a validator emit without validation', () => {
    registerEmitter('opencode', stubEmitter('opencode'));
    const result = transpile(fixture(), ['opencode'], ctx);
    expect(result.files).toHaveLength(1);
  });

  it('adding an emitter requires no engine change (open/closed via registry)', () => {
    expect(hasEmitter('factory')).toBe(false);
    registerEmitter('factory', stubEmitter('factory'));
    expect(hasEmitter('factory')).toBe(true);
    expect(getEmitter('factory')).toBeDefined();
    expect(registeredEmitters()).toContain('factory');

    const result = transpile(fixture(), ['factory'], ctx);
    expect(result.files[0]?.tool).toBe('factory');
  });
});
