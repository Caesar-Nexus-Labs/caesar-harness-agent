import { afterEach, describe, expect, it } from 'vitest';
import { agentsMdEmitter } from './emitters/adapters/fallback/agents-md-emitter.js';
import {
  clearAggregateEmitters,
  hasAggregateEmitter,
  registerAggregateEmitter,
} from './emitters/core/emitter-interface.js';
import { buildAgent } from './emitters/adapters/pilot/pilot-emitter-test-fixtures.js';
import { registerFallbackEmitters } from './emitters/registry/register-fallback-emitters.js';
import { TranspileValidationError, transpileAggregate } from './transpile.js';
import {
  clearOutputValidators,
  registerOutputValidator,
  validationFailed,
} from './validation/output-validator-interface.js';

// Aggregate transpile path — separate from per-agent transpile(). Runs aggregate emitters
// over the FULL agent set and validates the single emitted file post-emit.

const ctx = { distRoot: '/tmp/dist' };

afterEach(() => {
  clearAggregateEmitters();
  clearOutputValidators();
});

describe('transpileAggregate', () => {
  it('skips tools without a registered aggregate emitter', () => {
    const result = transpileAggregate([buildAgent()], ['agents-md'], ctx);
    expect(result.files).toEqual([]);
    expect(result.skipped).toEqual(['agents-md']);
  });

  it('emits one AGENTS.md across all agents once registered', () => {
    registerFallbackEmitters();
    expect(hasAggregateEmitter('agents-md')).toBe(true);

    const agents = [buildAgent({ name: 'a' }), buildAgent({ name: 'b' })];
    const result = transpileAggregate(agents, ['agents-md'], ctx);

    expect(result.skipped).toEqual([]);
    expect(result.files.length).toBe(1);
    expect(result.files[0]?.relativePath).toBe('AGENTS.md');
    expect(result.files[0]?.content).toContain('### a');
    expect(result.files[0]?.content).toContain('### b');
  });

  it('throws TranspileValidationError when the aggregate validator rejects (default)', () => {
    registerAggregateEmitter('agents-md', agentsMdEmitter);
    registerOutputValidator('agents-md', () => validationFailed(['boom']));
    expect(() => transpileAggregate([buildAgent()], ['agents-md'], ctx)).toThrow(
      TranspileValidationError,
    );
  });

  it('collects validation errors instead of throwing when configured', () => {
    registerAggregateEmitter('agents-md', agentsMdEmitter);
    registerOutputValidator('agents-md', () => validationFailed(['boom']));
    const result = transpileAggregate([buildAgent()], ['agents-md'], ctx, {
      throwOnInvalidOutput: false,
    });
    expect(result.files).toEqual([]);
    expect(result.validationErrors).toEqual([{ tool: 'agents-md', errors: ['boom'] }]);
  });
});
