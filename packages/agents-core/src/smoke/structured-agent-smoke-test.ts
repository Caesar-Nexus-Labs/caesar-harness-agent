import { parse as parseToml } from '@iarna/toml';
import { parse as parseYaml } from 'yaml';
import { validateBody } from '../schema/body-section-validator.js';

// Smoke-test harness for STRUCTURED agent files (kiro JSON, codex TOML, kilo YAML). Simulates
// "this file loads in the tool" WITHOUT running the tool: re-parse the emitted JSON/TOML/YAML,
// then structurally assert the config shape + the embedded prompt body. Companion to
// markdown-agent-smoke-test.ts (the YAML-frontmatter MD emitters: claude, opencode, factory,
// copilot, gemini, openhands).
//
// Checks (G6 — tech-stack §4 build order):
//   1. parser (JSON.parse / TOML.parse / YAML.parse) succeeds without throwing.
//   2. parsed value is a non-empty object.
//   3. listed required keys exist and are non-empty.
//   4. the prompt/body field contains the 6 required section headings, in order.
//   5. (aggregate) a listed array field is a non-empty array (e.g. kilo `customModes`).

export interface StructuredSmokeResult {
  ok: boolean;
  errors: string[];
}

export type StructuredFormat = 'json' | 'toml' | 'yaml';

export interface StructuredSmokeOptions {
  /** Serialization format of `content`. */
  format: StructuredFormat;
  /** Keys that must be present + non-empty (e.g. ['name', 'description']). */
  requiredFields?: readonly string[];
  /** Key holding the prompt body to run the 6-section check against (e.g. 'prompt'). */
  bodyField?: string;
  /** Key that must hold a non-empty array (e.g. kilo `customModes`). */
  arrayField?: string;
}

/** True for a value treated as "empty" (missing / blank string / empty array). */
function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Parse the content per its declared format; throws on malformed input. */
function parseStructured(content: string, format: StructuredFormat): unknown {
  if (format === 'json') return JSON.parse(content);
  if (format === 'toml') return parseToml(content);
  return parseYaml(content);
}

/**
 * Re-parse + structurally validate an emitted JSON/TOML agent file.
 * `content` is the full file string.
 */
export function structuredSmokeTest(
  content: string,
  opts: StructuredSmokeOptions,
): StructuredSmokeResult {
  const errors: string[] = [];

  let data: Record<string, unknown>;
  try {
    const parsed = parseStructured(content, opts.format);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, errors: [`parsed ${opts.format} is not an object`] };
    }
    data = parsed as Record<string, unknown>;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: [`failed to re-parse ${opts.format}: ${reason}`] };
  }

  if (Object.keys(data).length === 0) errors.push('config object is empty');

  for (const field of opts.requiredFields ?? []) {
    if (isEmptyValue(data[field])) errors.push(`required field "${field}" is empty`);
  }

  if (opts.arrayField !== undefined) {
    const arr = data[opts.arrayField];
    if (!Array.isArray(arr) || arr.length === 0) {
      errors.push(`array field "${opts.arrayField}" is missing or empty`);
    }
  }

  if (opts.bodyField !== undefined) {
    const body = data[opts.bodyField];
    if (typeof body !== 'string' || body.trim().length === 0) {
      errors.push(`body field "${opts.bodyField}" is empty or not a string`);
    } else {
      const bodyResult = validateBody(body);
      if (bodyResult.missingSections.length > 0) {
        errors.push(`body missing required sections: ${bodyResult.missingSections.join(', ')}`);
      }
      if (bodyResult.outOfOrder) errors.push('body sections are out of canonical order');
    }
  }

  return { ok: errors.length === 0, errors };
}
