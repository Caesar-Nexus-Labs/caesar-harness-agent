import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { mapPermission } from '../../../mapping/permission-map.js';
import { getToolTargetMeta } from '../../../mapping/tool-targets.js';
import { useWhenLine } from '../fallback/agents-md-text.js';
import type { AggregateEmitter, EmitContext, EmittedFile } from '../../core/emitter-interface.js';
import { type KiloMode, serializeKiloModes } from '../../serializers/kilo-modes-serializer.js';

// kilo AGGREGATE emitter: ALL agents → one root `.kilocodemodes` (YAML `customModes:` array).
// Kilo is the first native-tier AGGREGATE target. It carries REAL per-agent permission via
// `groups` (mapPermission → plain strings, no fileRegex), but NO per-agent model (legacy format
// limit → inherits, matching the locked "model inherit" decision). Roo-origin official format
// (88% confidence, verified 2026-06-01). Pure (no I/O).
//
// OMITTED by design: model (no per-mode model in the legacy format), iconName, source
// (auto-managed by Kilo), version/$schema, fileRegex (canonical schema has no file-scope field).

/** Derive a Title Case display name from a kebab-case slug (`code-reviewer` → `Code Reviewer`). */
function titleCaseFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length > 0 ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Split the prompt body into a role definition + remaining custom instructions.
 * roleDefinition = the FIRST section's content (the persona line(s)); customInstructions = the
 * rest of the body from the second `## ` heading onward. KISS fallback: if there is no clean
 * second-heading split, the whole body becomes roleDefinition and customInstructions is omitted.
 */
function splitRoleAndInstructions(body: string): {
  roleDefinition: string;
  customInstructions?: string;
} {
  const normalized = body.replace(/\r\n?/g, '\n').trim();
  const lines = normalized.split('\n');

  // Index of the first and second top-level `## ` headings.
  const headingIdxs: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i] ?? '')) headingIdxs.push(i);
    if (headingIdxs.length === 2) break;
  }

  // No clean structure → whole body is the role definition.
  if (headingIdxs.length < 2) return { roleDefinition: normalized };

  const firstHeading = headingIdxs[0] ?? 0;
  const secondHeading = headingIdxs[1] ?? lines.length;

  // Role = content lines AFTER the first heading, up to the second heading.
  const role = lines
    .slice(firstHeading + 1, secondHeading)
    .join('\n')
    .trim();
  const rest = lines.slice(secondHeading).join('\n').trim();

  if (role.length === 0) return { roleDefinition: normalized };
  return {
    roleDefinition: role,
    customInstructions: rest.length > 0 ? rest : undefined,
  };
}

/** Group sort: category asc, then slug asc (mirrors agents-md-emitter determinism). */
function sortByCategoryThenSlug(agents: readonly CanonicalAgent[]): CanonicalAgent[] {
  return [...agents].sort((a, b) => {
    const cat = a.frontmatter.category.localeCompare(b.frontmatter.category);
    return cat !== 0 ? cat : a.slug.localeCompare(b.slug);
  });
}

/** Build one Kilo mode entry from a canonical agent. */
function toMode(agent: CanonicalAgent): KiloMode {
  const fm = agent.frontmatter;
  const { roleDefinition, customInstructions } = splitRoleAndInstructions(agent.body);
  const { groups } = mapPermission(fm.permission, 'kilo');

  const mode: KiloMode = {
    slug: agent.slug,
    name: titleCaseFromSlug(agent.slug),
    roleDefinition,
    whenToUse: useWhenLine(agent),
    description: fm.description.trim(),
    groups,
  };
  if (customInstructions !== undefined) mode.customInstructions = customInstructions;
  return mode;
}

export const kiloEmitter: AggregateEmitter = (
  agents: readonly CanonicalAgent[],
  _ctx: EmitContext,
): EmittedFile => {
  const modes = sortByCategoryThenSlug(agents).map(toMode);
  const content = serializeKiloModes(modes);
  const { outputSubdir } = getToolTargetMeta('kilo');
  const relativePath = outputSubdir ? `${outputSubdir}/.kilocodemodes` : '.kilocodemodes';

  return { tool: 'kilo', relativePath, content };
};
