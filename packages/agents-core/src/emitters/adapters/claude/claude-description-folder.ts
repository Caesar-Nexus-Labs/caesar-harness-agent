import type { CanonicalAgentFrontmatter } from '../../../schema/canonical-agent-schema.js';

// Claude has no separate `when_to_use`/`examples` frontmatter fields — its routing relies
// entirely on `description` (subagent-standards §6). So we FOLD the canonical when_to_use
// + example trigger phrases into the description as a trailing "Use when:" line.

/**
 * Build the Claude `description` by folding `when_to_use` + example triggers into the base
 * description. Returns the base description unchanged when neither extra field is present.
 */
export function foldClaudeDescription(fm: CanonicalAgentFrontmatter): string {
  const base = fm.description.trim();
  const parts: string[] = [];

  if (fm.when_to_use?.trim()) parts.push(fm.when_to_use.trim());

  const triggers = (fm.examples ?? []).map((e) => e.trigger.trim()).filter((t) => t.length > 0);
  if (triggers.length > 0) parts.push(`e.g. ${triggers.join('; ')}`);

  if (parts.length === 0) return base;
  return `${base}\n\nUse when: ${parts.join(' ')}`;
}
