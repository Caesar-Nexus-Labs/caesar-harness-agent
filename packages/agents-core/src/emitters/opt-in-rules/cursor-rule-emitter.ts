import type { CanonicalAgent } from '../../loader/agent-file-loader.js';
import { oneLine } from '../agents-md-text.js';
import { frontmatterBlock, type RuleFile, ruleBody } from './rule-file-shared.js';

// OPT-IN Cursor rule emitter: CanonicalAgent → `.cursor/rules/{name}.mdc`.
// Cursor reads `.mdc` (markdown + frontmatter) from `.cursor/rules/` (plain `.md` there is
// IGNORED). An "Agent-Requested" rule sets `alwaysApply: false` + a `description` so the
// model pulls it in by relevance — the closest emulation of an on-demand subagent (report §4).
// Optional `globs` scope a rule to matching files.
//
// Frontmatter key order (deterministic): description, alwaysApply, globs.

export interface CursorRuleOptions {
  /** Optional file globs that scope when Cursor auto-attaches the rule. */
  globs?: string[];
}

export function cursorRuleEmitter(agent: CanonicalAgent, opts: CursorRuleOptions = {}): RuleFile {
  const fm = agent.frontmatter;

  const data: Record<string, unknown> = {
    description: oneLine(fm.description),
    alwaysApply: false,
  };
  if (opts.globs && opts.globs.length > 0) data.globs = opts.globs;

  const content = `${frontmatterBlock(data)}\n\n${ruleBody(agent)}\n`;

  return {
    relativePath: `.cursor/rules/${agent.slug}.mdc`,
    content,
    warnings: [],
  };
}
