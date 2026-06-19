import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { clearAggregateEmitters, clearEmitters } from '../emitters/core/emitter-interface.js';
import { registerExtendedNativeEmitters } from '../emitters/registry/register-extended-native-emitters.js';
import { registerPilotEmitters } from '../emitters/registry/register-pilot-emitters.js';
import { parseAgentFile } from '../loader/agent-file-loader.js';
import { smokeTest } from '../smoke/markdown-agent-smoke-test.js';
import { structuredSmokeTest } from '../smoke/structured-agent-smoke-test.js';
import { transpile, transpileAggregate } from '../transpile.js';
import { clearOutputValidators } from '../validation/output-validator-interface.js';

// G5+G6 integration gate: every authored agent in agents/** must parse, transpile to the
// pilot tools + the 3 extended emitters (gemini, openhands per-agent; kilo aggregate), and pass
// the smoke test. Locks quality + guards regressions. Smoke runs over `emitted.content`.

// Repo root = four levels up from this file (packages/agents-core/src/integration).
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..');
const agentsRoot = join(repoRoot, 'agents');

function authoredAgentFiles(): string[] {
  if (!existsSync(agentsRoot)) return [];
  const out: string[] = [];
  for (const cat of readdirSync(agentsRoot)) {
    if (!/^[0-9]{2}-/.test(cat)) continue;
    const catDir = join(agentsRoot, cat);
    for (const f of readdirSync(catDir)) {
      if (f.endsWith('.md')) out.push(join(catDir, f));
    }
  }
  return out;
}

const files = authoredAgentFiles();

describe('authored agents — G5 transpile + G6 smoke (pilot + extended emitters)', () => {
  it('finds at least the 7 pilot core-development agents', () => {
    expect(files.length).toBeGreaterThanOrEqual(7);
  });

  for (const path of files) {
    it(`parses + transpiles + smoke-tests: ${path.split(/[\\/]/).slice(-2).join('/')}`, () => {
      clearEmitters();
      clearAggregateEmitters();
      clearOutputValidators();
      registerPilotEmitters();
      registerExtendedNativeEmitters();

      const agent = parseAgentFile(path);

      // Per-agent native: claude + opencode (pilot) + gemini + openhands (extended).
      const result = transpile(agent, ['claude', 'opencode', 'gemini', 'openhands'], {
        distRoot: 'dist',
      });
      expect(result.skipped).toEqual([]);
      expect(result.validationErrors).toEqual([]);
      expect(result.files.length).toBe(4);
      for (const emitted of result.files) {
        const smoke = smokeTest(emitted.content);
        expect(smoke.errors).toEqual([]);
        expect(smoke.ok).toBe(true);
      }
    });
  }

  it('kilo aggregate emits one valid .kilocodemodes over ALL authored agents', () => {
    clearEmitters();
    clearAggregateEmitters();
    clearOutputValidators();
    registerExtendedNativeEmitters();

    const agents = files.map((p) => parseAgentFile(p));
    const result = transpileAggregate(agents, ['kilo'], { distRoot: 'dist' });
    expect(result.skipped).toEqual([]);
    expect(result.validationErrors).toEqual([]);
    expect(result.files.length).toBe(1);

    const emitted = result.files[0];
    expect(emitted?.relativePath).toBe('.kilocodemodes');
    // round-trip: customModes is a non-empty array covering every authored agent.
    const smoke = structuredSmokeTest(emitted?.content ?? '', {
      format: 'yaml',
      arrayField: 'customModes',
    });
    expect(smoke.errors).toEqual([]);
  });
});
