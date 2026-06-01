import { stringify as stringifyYaml } from 'yaml';
import type { CanonicalAgent } from '../../loader/agent-file-loader.js';

// Shared types + helpers for the OPT-IN per-tool rule emitters (Cursor `.mdc`, Windsurf,
// Cline). These tools have NO native subagent file — they read "rules" files that the model
// pulls in by relevance. The aggregate AGENTS.md is the default; these provide per-agent
// activation when a user explicitly opts in. They are NOT wired into the typed transpile
// registry (their dirs aren't ToolTarget destinations), so they return a plain RuleFile.

/** One emitted rule file for a rules-only tool. `warnings` flags non-fatal issues (e.g. truncation). */
export interface RuleFile {
  /** Path relative to the repo root (e.g. `.cursor/rules/backend-developer.mdc`). */
  relativePath: string;
  content: string;
  /** Non-fatal advisories (e.g. body truncated to satisfy a char limit). */
  warnings: string[];
}

/** Serialize a frontmatter object to a `---`-delimited YAML block (deterministic key order). */
export function frontmatterBlock(data: Record<string, unknown>): string {
  const yaml = stringifyYaml(data, { lineWidth: 0 }).trimEnd();
  return `---\n${yaml}\n---`;
}

/**
 * The rule body = the agent's full prompt (the 6-section markdown), normalized to LF and
 * trimmed. Rules-only tools treat this as always-available guidance for the named agent.
 */
export function ruleBody(agent: CanonicalAgent): string {
  return agent.body.replace(/\r\n?/g, '\n').trim();
}

/**
 * Truncate a body to at most `maxChars`, cutting at a paragraph (blank-line) boundary when
 * possible and appending a clear marker. Returns the (possibly truncated) body + whether it
 * was cut, so the caller can surface a warning.
 */
export function truncateBody(
  body: string,
  maxChars: number,
  marker: string,
): { body: string; truncated: boolean } {
  if (body.length <= maxChars) return { body, truncated: false };

  const budget = Math.max(0, maxChars - marker.length - 2);
  const slice = body.slice(0, budget);
  const lastBreak = slice.lastIndexOf('\n\n');
  const head = (lastBreak > 0 ? slice.slice(0, lastBreak) : slice).trimEnd();
  return { body: `${head}\n\n${marker}`, truncated: true };
}
