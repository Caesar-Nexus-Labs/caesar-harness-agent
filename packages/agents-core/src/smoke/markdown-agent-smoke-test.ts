import matter from 'gray-matter';
import { validateBody } from '../schema/body-section-validator.js';

// Smoke-test harness for MD-based agent files (claude, opencode, future MD emitters).
// Simulates "this file loads in the tool" WITHOUT running the tool: re-parse the emitted
// `.md` with gray-matter, then structurally assert frontmatter + body shape.
//
// Checks (G6 — tech-stack §4 build order):
//   1. gray-matter re-parses without throwing.
//   2. frontmatter object is present + non-empty.
//   3. listed required frontmatter keys exist and are non-empty (no blank routing fields).
//   4. body contains the 6 required section headings, in order (reuses validateBody).

export interface SmokeResult {
  ok: boolean;
  errors: string[];
}

export interface SmokeOptions {
  /** Frontmatter keys that must be present + non-empty (e.g. ['description']). */
  requiredFields?: readonly string[];
}

/** True for a frontmatter value treated as "empty" (missing / blank string / empty array). */
function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Re-parse + structurally validate an emitted markdown agent file.
 * `content` is the full file string (frontmatter + body).
 */
export function smokeTest(content: string, opts: SmokeOptions = {}): SmokeResult {
  const errors: string[] = [];

  let data: Record<string, unknown>;
  let body: string;
  try {
    const parsed = matter(content);
    data = parsed.data as Record<string, unknown>;
    body = parsed.content;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: [`failed to re-parse frontmatter: ${reason}`] };
  }

  if (data === null || typeof data !== 'object' || Object.keys(data).length === 0) {
    errors.push('frontmatter is missing or empty');
  }

  for (const field of opts.requiredFields ?? []) {
    if (isEmptyValue(data[field])) errors.push(`required frontmatter field "${field}" is empty`);
  }

  if (body.trim().length === 0) {
    errors.push('body is empty');
  } else {
    const bodyResult = validateBody(body);
    if (bodyResult.missingSections.length > 0) {
      errors.push(`body missing required sections: ${bodyResult.missingSections.join(', ')}`);
    }
    if (bodyResult.outOfOrder) errors.push('body sections are out of canonical order');
  }

  return { ok: errors.length === 0, errors };
}
