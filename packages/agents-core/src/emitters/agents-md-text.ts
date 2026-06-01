import type { CanonicalAgent } from '../loader/agent-file-loader.js';
import { type Permission, TOOLS, type Tool } from '../schema/enums.js';

// Text helpers for the aggregate AGENTS.md emitter. AGENTS.md is freeform markdown
// (no required fields) so these produce COMPACT, deterministic one-liners from the
// canonical agent: a "Use when" routing hint, a permission/tools summary, and a single
// boundary line lifted from the prompt body's `## Boundaries` section.

/** Collapse all runs of whitespace (incl. newlines) into single spaces + trim. */
export function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Strip markdown emphasis/code markers that would clutter a plain one-liner. */
function stripEmphasis(text: string): string {
  return text.replace(/\*\*|__|`/g, '');
}

/**
 * Truncate at a word boundary to `max` chars, appending `…` when cut. Deterministic
 * (no locale/time dependence) so snapshots stay stable.
 */
export function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  const head = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${head.trimEnd()}…`;
}

/** The "Use when" routing line: prefer `when_to_use`, fall back to `description`. */
export function useWhenLine(agent: CanonicalAgent): string {
  const fm = agent.frontmatter;
  const source = fm.when_to_use?.trim() ? fm.when_to_use : fm.description;
  return truncateAtWord(oneLine(stripEmphasis(source)), 240);
}

/** Sort canonical tools by enum order so the summary is deterministic. */
function sortTools(tools: readonly Tool[]): Tool[] {
  return [...tools].sort((a, b) => TOOLS.indexOf(a) - TOOLS.indexOf(b));
}

/**
 * Compact tools summary. A non-empty allowlist lists the canonical tools; an empty list
 * means "no explicit restriction" → the permission-tier default (read-only triad, or
 * "all" for edit/full).
 */
export function toolsSummary(tools: readonly Tool[], permission: Permission): string {
  if (tools.length > 0) return sortTools(tools).join(', ');
  if (permission === 'read-only') return 'read, grep, glob';
  return 'all';
}

/**
 * Extract a single boundary line from the body's `## Boundaries` section: prefer the first
 * bullet item, else the first non-empty line. Returns `undefined` if no section/content.
 */
export function boundaryLine(body: string): string | undefined {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  let inSection = false;
  const collected: string[] = [];
  for (const line of lines) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      if (inSection) break; // next section ends the Boundaries block
      inSection = /^boundaries$/i.test((heading[1] ?? '').trim());
      continue;
    }
    if (inSection) collected.push(line);
  }
  if (collected.length === 0) return undefined;

  const bullet = collected.find((l) => /^\s*[-*]\s+/.test(l));
  const firstNonEmpty = collected.find((l) => l.trim().length > 0);
  const raw = bullet ?? firstNonEmpty;
  if (raw === undefined) return undefined;

  const cleaned = oneLine(stripEmphasis(raw.replace(/^\s*[-*]\s+/, '')));
  return cleaned.length > 0 ? truncateAtWord(cleaned, 200) : undefined;
}
