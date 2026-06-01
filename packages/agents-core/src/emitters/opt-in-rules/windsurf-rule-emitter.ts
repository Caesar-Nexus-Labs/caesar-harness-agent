import type { CanonicalAgent } from '../../loader/agent-file-loader.js';
import { oneLine } from '../agents-md-text.js';
import { frontmatterBlock, type RuleFile, ruleBody, truncateBody } from './rule-file-shared.js';

// OPT-IN Windsurf rule emitter: CanonicalAgent → `.windsurf/rules/{name}.md`.
// Windsurf reads workspace rules from `.windsurf/rules/`; `trigger: model_decision` + a
// `description` lets the model activate the rule on demand — closest to a subagent (report §4).
//
// HARD LIMIT: Windsurf caps workspace rule files at 12,000 chars. This emitter ENFORCES the
// cap — if the assembled file would exceed it, the prompt body is truncated at a paragraph
// boundary (frontmatter is preserved) and a warning is returned. Output is always ≤12k chars.
//
// Frontmatter key order (deterministic): trigger, description.

/** Windsurf workspace rule file hard char limit (report §2). */
export const WINDSURF_MAX_CHARS = 12000;

const TRUNCATION_MARKER =
  '> [truncated to fit the Windsurf 12,000-char rule limit — see the full agent definition]';

export function windsurfRuleEmitter(agent: CanonicalAgent): RuleFile {
  const fm = agent.frontmatter;

  const frontmatter = frontmatterBlock({
    trigger: 'model_decision',
    description: oneLine(fm.description),
  });

  // Budget for the body = limit minus frontmatter and the two joining newlines + trailing LF.
  const overhead = frontmatter.length + 3;
  const bodyBudget = WINDSURF_MAX_CHARS - overhead;

  const full = ruleBody(agent);
  const { body, truncated } = truncateBody(full, bodyBudget, TRUNCATION_MARKER);

  const content = `${frontmatter}\n\n${body}\n`;
  const warnings = truncated
    ? [
        `body truncated from ${full.length} to fit the Windsurf ${WINDSURF_MAX_CHARS}-char ` +
          `limit (final size ${content.length})`,
      ]
    : [];

  return {
    relativePath: `.windsurf/rules/${agent.slug}.md`,
    content,
    warnings,
  };
}
