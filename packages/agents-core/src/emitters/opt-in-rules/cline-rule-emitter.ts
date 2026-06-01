import type { CanonicalAgent } from '../../loader/agent-file-loader.js';
import { frontmatterBlock, type RuleFile, ruleBody } from './rule-file-shared.js';

// OPT-IN Cline rule emitter: CanonicalAgent → `.clinerules/{NN}-{name}.md`.
// Cline combines every file in `.clinerules/` into its rules bank; a numeric `NN-` prefix
// orders them (report §2). An optional `paths:` frontmatter array scopes a rule to matching
// files (omitted = always-on; `[]` = never). Plain markdown otherwise — frontmatter is only
// emitted when `paths` is provided, matching Cline's "optional YAML frontmatter" convention.

export interface ClineRuleOptions {
  /** 1-based ordering index → `NN-` filename prefix (default 1 → `01-`). */
  order?: number;
  /** Optional file globs that scope the rule; omitted → always-on. */
  paths?: string[];
}

/** Zero-pad a 1-based order to a 2-digit `NN` prefix (clamped to >= 1). */
function orderPrefix(order: number): string {
  return String(Math.max(1, Math.trunc(order))).padStart(2, '0');
}

export function clineRuleEmitter(agent: CanonicalAgent, opts: ClineRuleOptions = {}): RuleFile {
  const prefix = orderPrefix(opts.order ?? 1);
  const body = ruleBody(agent);

  const content =
    opts.paths && opts.paths.length > 0
      ? `${frontmatterBlock({ paths: opts.paths })}\n\n${body}\n`
      : `${body}\n`;

  return {
    relativePath: `.clinerules/${prefix}-${agent.slug}.md`,
    content,
    warnings: [],
  };
}
