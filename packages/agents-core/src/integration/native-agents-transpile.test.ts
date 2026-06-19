import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { clearEmitters } from '../emitters/core/emitter-interface.js';
import { registerNativeEmitters } from '../emitters/registry/register-native-emitters.js';
import { parseAgentFile } from '../loader/agent-file-loader.js';
import type { ToolTarget } from '../mapping/tool-targets.js';
import { smokeTest } from '../smoke/markdown-agent-smoke-test.js';
import { structuredSmokeTest } from '../smoke/structured-agent-smoke-test.js';
import { transpile } from '../transpile.js';
import { clearOutputValidators } from '../validation/output-validator-interface.js';

// G5+G6 integration gate for ALL 6 native emitters: every authored cat-01 agent must parse,
// transpile to every native tool, pass output validation, and re-parse cleanly per format
// (markdown smoke for claude/opencode/factory/copilot; structured smoke for kiro/codex).

const NATIVE_TOOLS: ToolTarget[] = ['claude', 'opencode', 'kiro', 'codex', 'factory', 'copilot'];

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..');
const cat01 = join(repoRoot, 'agents', '01-core-development');

function cat01Files(): string[] {
  if (!existsSync(cat01)) return [];
  return readdirSync(cat01)
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(cat01, f));
}

const files = cat01Files();

describe('native emitters — G5 transpile + G6 smoke over cat-01 agents', () => {
  it('finds the 7 cat-01 core-development agents', () => {
    expect(files.length).toBeGreaterThanOrEqual(7);
  });

  for (const path of files) {
    const label = path.split(/[\\/]/).slice(-1)[0];
    it(`transpiles + validates + smoke-tests all 6 native tools: ${label}`, () => {
      clearEmitters();
      clearOutputValidators();
      registerNativeEmitters();

      const agent = parseAgentFile(path);
      const result = transpile(agent, NATIVE_TOOLS, { distRoot: 'dist' });

      expect(result.skipped).toEqual([]);
      expect(result.validationErrors).toEqual([]);
      expect(result.files.length).toBe(NATIVE_TOOLS.length);

      for (const emitted of result.files) {
        if (emitted.tool === 'kiro') {
          expect(
            structuredSmokeTest(emitted.content, { format: 'json', bodyField: 'prompt' }).errors,
          ).toEqual([]);
        } else if (emitted.tool === 'codex') {
          expect(
            structuredSmokeTest(emitted.content, {
              format: 'toml',
              bodyField: 'developer_instructions',
            }).errors,
          ).toEqual([]);
        } else {
          expect(smokeTest(emitted.content).errors).toEqual([]);
        }
      }
    });
  }
});
