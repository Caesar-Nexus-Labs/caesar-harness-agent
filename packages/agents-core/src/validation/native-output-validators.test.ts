import { describe, expect, it } from 'vitest';
import { codexEmitter } from '../emitters/adapters/pilot/codex-emitter.js';
import { copilotEmitter } from '../emitters/adapters/copilot/copilot-emitter.js';
import type { EmitContext } from '../emitters/core/emitter-interface.js';
import { factoryEmitter } from '../emitters/adapters/pilot/factory-emitter.js';
import { geminiEmitter } from '../emitters/adapters/gemini/gemini-emitter.js';
import { kiroEmitter } from '../emitters/adapters/pilot/kiro-emitter.js';
import { openhandsEmitter } from '../emitters/adapters/pilot/openhands-emitter.js';
import {
  agentWithReasoningEffort,
  buildAgent,
  fullPermissionAgent,
  readOnlyAgent,
} from '../emitters/adapters/pilot/pilot-emitter-test-fixtures.js';
import { codexOutputValidator } from './codex-output-validator.js';
import { copilotOutputValidator } from './copilot-output-validator.js';
import { factoryOutputValidator } from './factory-output-validator.js';
import { geminiOutputValidator } from './gemini-output-validator.js';
import { kiroOutputValidator } from './kiro-output-validator.js';
import { openhandsOutputValidator } from './openhands-output-validator.js';

const ctx: EmitContext = { distRoot: '/tmp/dist' };

describe('codexOutputValidator', () => {
  it('accepts valid emitted codex content', () => {
    for (const a of [readOnlyAgent(), fullPermissionAgent(), agentWithReasoningEffort()]) {
      expect(codexOutputValidator(codexEmitter(a, ctx).content).ok).toBe(true);
    }
  });

  it('rejects a codex file that leaks a tools field', () => {
    const malformed =
      'name = "bad"\ndescription = "x"\ndeveloper_instructions = "y"\ntools = ["read"]\n';
    const result = codexOutputValidator(malformed);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/tools|Unrecognized/i);
  });

  it('rejects missing required keys', () => {
    const result = codexOutputValidator('name = "x"\n');
    expect(result.ok).toBe(false);
  });

  it('rejects malformed TOML', () => {
    expect(codexOutputValidator('= = =').ok).toBe(false);
  });
});

describe('kiroOutputValidator', () => {
  it('accepts valid emitted kiro content', () => {
    for (const a of [readOnlyAgent(), fullPermissionAgent(), buildAgent()]) {
      expect(kiroOutputValidator(kiroEmitter(a, ctx).content).ok).toBe(true);
    }
  });

  it('rejects allowedTools that auto-approve write/shell', () => {
    const malformed = JSON.stringify({
      name: 'bad',
      description: 'leaks',
      prompt: 'p',
      tools: ['read', 'write'],
      allowedTools: ['read', 'write'],
    });
    const result = kiroOutputValidator(malformed);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('mutating');
  });

  it('rejects allowedTools not present in tools', () => {
    const malformed = JSON.stringify({
      name: 'bad',
      description: 'x',
      prompt: 'p',
      tools: ['read'],
      allowedTools: ['fetch'],
    });
    expect(kiroOutputValidator(malformed).errors.join(' ')).toContain('not present in tools');
  });

  it('rejects malformed JSON', () => {
    expect(kiroOutputValidator('{not json').ok).toBe(false);
  });
});

describe('factoryOutputValidator', () => {
  it('accepts valid emitted factory content', () => {
    for (const a of [readOnlyAgent(), fullPermissionAgent(), agentWithReasoningEffort()]) {
      expect(factoryOutputValidator(factoryEmitter(a, ctx).content).ok).toBe(true);
    }
  });

  it('rejects an unknown tools category', () => {
    const malformed = '---\nname: bad\ndescription: x\nmodel: inherit\ntools: all\n---\n\nbody';
    expect(factoryOutputValidator(malformed).ok).toBe(false);
  });

  it('rejects missing model', () => {
    const malformed = '---\nname: bad\ndescription: x\n---\n\nbody';
    expect(factoryOutputValidator(malformed).ok).toBe(false);
  });
});

describe('copilotOutputValidator', () => {
  it('accepts valid emitted copilot content', () => {
    for (const a of [readOnlyAgent(), fullPermissionAgent(), agentWithReasoningEffort()]) {
      expect(copilotOutputValidator(copilotEmitter(a, ctx).content).ok).toBe(true);
    }
  });

  it('rejects a leaked target field', () => {
    const malformed = '---\nname: bad\ndescription: x\ntarget: vscode\n---\n\nbody';
    const result = copilotOutputValidator(malformed);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/target|Unrecognized/i);
  });

  it('rejects a leaked handoffs field', () => {
    const malformed = '---\nname: bad\ndescription: x\nhandoffs: []\n---\n\nbody';
    expect(copilotOutputValidator(malformed).ok).toBe(false);
  });

  it('rejects an unknown tool alias', () => {
    const malformed = '---\nname: bad\ndescription: x\ntools:\n  - editFiles\n---\n\nbody';
    const result = copilotOutputValidator(malformed);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('unknown Copilot tool alias');
  });
});

describe('geminiOutputValidator', () => {
  it('accepts valid emitted gemini content', () => {
    for (const a of [readOnlyAgent(), fullPermissionAgent(), buildAgent()]) {
      expect(geminiOutputValidator(geminiEmitter(a, ctx).content).ok).toBe(true);
    }
  });

  it('rejects an empty description', () => {
    const bad = '---\nname: foo\ndescription: ""\nkind: local\n---\n\nbody';
    expect(geminiOutputValidator(bad).ok).toBe(false);
  });

  it('rejects a non-kebab name', () => {
    const bad = '---\nname: Foo_Bar\ndescription: a valid description\nkind: local\n---\n\nbody';
    expect(geminiOutputValidator(bad).ok).toBe(false);
  });

  it('rejects a leaked tools key (inherit invariant)', () => {
    const bad =
      '---\nname: foo\ndescription: a valid description\nkind: local\ntools:\n  - read\n---\n\nbody';
    const result = geminiOutputValidator(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/tools|Unrecognized/i);
  });

  it('rejects a leaked model key (inherit invariant)', () => {
    const bad =
      '---\nname: foo\ndescription: a valid description\nkind: local\nmodel: gpt-5\n---\n\nbody';
    const result = geminiOutputValidator(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/model|Unrecognized/i);
  });
});

describe('openhandsOutputValidator', () => {
  it('accepts valid emitted openhands content', () => {
    for (const a of [readOnlyAgent(), fullPermissionAgent(), buildAgent()]) {
      expect(openhandsOutputValidator(openhandsEmitter(a, ctx).content).ok).toBe(true);
    }
  });

  it('rejects an empty description', () => {
    const bad = '---\nname: foo\ndescription: ""\n---\n\nbody';
    expect(openhandsOutputValidator(bad).ok).toBe(false);
  });

  it('rejects a leaked triggers key', () => {
    const bad =
      '---\nname: foo\ndescription: a valid description\ntriggers:\n  - review\n---\n\nbody';
    const result = openhandsOutputValidator(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/triggers|Unrecognized/i);
  });

  it('rejects a leaked tools key (inherit invariant)', () => {
    const bad = '---\nname: foo\ndescription: a valid description\ntools:\n  - read\n---\n\nbody';
    const result = openhandsOutputValidator(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/tools|Unrecognized/i);
  });
});
