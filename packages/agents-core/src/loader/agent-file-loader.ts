import { readFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import matter from 'gray-matter';
import { AgentValidationError } from '../errors.js';
import { validateBody } from '../schema/body-section-validator.js';
import {
  type CanonicalAgentFrontmatter,
  CanonicalAgentFrontmatterSchema,
} from '../schema/canonical-agent-schema.js';

/** A fully parsed, validated canonical agent. Emitters consume this. */
export interface CanonicalAgent {
  frontmatter: CanonicalAgentFrontmatter;
  body: string;
  /** slug = filename without .md, equals frontmatter.name. */
  slug: string;
  /** Source file absolute path. */
  path: string;
  /** Non-fatal body advisories (e.g. >300-line soft cap). Empty when none. */
  bodyWarnings: string[];
}

/** Parse + validate a single agent .md file. Throws AgentValidationError on any failure. */
export function parseAgentFile(path: string): CanonicalAgent {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    // Normalize fs errors (ENOENT, EACCES, …) into the structured contract.
    const reason = err instanceof Error ? err.message : String(err);
    throw new AgentValidationError(path, [`cannot read file: ${reason}`]);
  }
  const { data, content } = matter(raw);

  const parsed = CanonicalAgentFrontmatterSchema.safeParse(data);
  if (!parsed.success) throw AgentValidationError.fromZod(path, parsed.error.issues);

  const fm = parsed.data;
  const issues: string[] = [];

  // category must match the parent directory name (consistency).
  const parentDir = basename(dirname(path));
  if (fm.category !== parentDir) {
    issues.push(`category "${fm.category}" does not match parent dir "${parentDir}"`);
  }

  // filename (slug) must equal frontmatter.name.
  const slug = basename(path, '.md');
  if (slug !== fm.name) {
    issues.push(`filename "${slug}" does not match name "${fm.name}"`);
  }

  // body must contain the 6 mandatory sections in order.
  const bodyResult = validateBody(content);
  if (bodyResult.missingSections.length > 0) {
    issues.push(`missing body sections: ${bodyResult.missingSections.join(', ')}`);
  }
  if (bodyResult.outOfOrder) {
    issues.push('body sections are out of canonical order');
  }

  if (issues.length > 0) throw new AgentValidationError(path, issues);

  return { frontmatter: fm, body: content.trim(), slug, path, bodyWarnings: bodyResult.warnings };
}
