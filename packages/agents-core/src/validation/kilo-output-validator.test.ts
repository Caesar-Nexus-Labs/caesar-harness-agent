import { describe, expect, it } from 'vitest';
import type { EmitContext } from '../emitters/core/emitter-interface.js';
import { kiloEmitter } from '../emitters/adapters/pilot/kilo-emitter.js';
import { buildAgent } from '../emitters/adapters/pilot/pilot-emitter-test-fixtures.js';
import { kiloOutputValidator } from './kilo-output-validator.js';

// G5 output validator for the aggregate `.kilocodemodes`. Asserts the customModes structure +
// the read-only poka-yoke (a [read]-only-tier mode must not carry edit/command) + group vocab.

const ctx: EmitContext = { distRoot: '/tmp/dist' };

describe('kiloOutputValidator', () => {
  it('passes on real emitted kilo content', () => {
    const readOnly = buildAgent({
      name: 'security-auditor',
      description: 'Read-only security auditor for vulnerability review and threat assessment.',
      category: '02-security',
      permission: 'read-only',
      tools: [],
    });
    const full = buildAgent({
      name: 'feature-builder',
      description: 'Implements features end-to-end across the codebase with full tooling.',
      permission: 'full',
      tools: ['read', 'edit', 'write', 'bash'],
    });
    const { content } = kiloEmitter([readOnly, full], ctx);
    expect(kiloOutputValidator(content).ok).toBe(true);
  });

  it('rejects a mode missing roleDefinition', () => {
    const bad = 'customModes:\n  - slug: x\n    name: X\n    groups:\n      - read\n';
    const result = kiloOutputValidator(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/roleDefinition/i);
  });

  it('rejects an unknown group string', () => {
    const bad =
      'customModes:\n  - slug: x\n    name: X\n    roleDefinition: r\n    groups:\n      - read\n      - browser\n';
    const result = kiloOutputValidator(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/group|browser/i);
  });

  it('rejects an empty customModes array', () => {
    expect(kiloOutputValidator('customModes: []\n').ok).toBe(false);
  });

  it('rejects malformed YAML', () => {
    expect(kiloOutputValidator('customModes:\n  - : :\n').ok).toBe(false);
  });
});
