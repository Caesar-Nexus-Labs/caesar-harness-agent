import { stringify as stringifyYaml } from 'yaml';
import type { CanonicalAgent } from '../loader/agent-file-loader.js';
import { mapPermission } from '../mapping/permission-map.js';
import type { AggregateEmitter, EmitContext, EmittedFile } from './emitter-interface.js';

// Roo Code YAML emitter: ALL agents → one root `.roomodes` (YAML `customModes:` array).
//
// `.roomodes` is the Roo Code (previously known as the original Roo extension) native mode
// format. It shares the same YAML structure as Kilo's `.kilocodemodes` but uses a different
// output filename and targets a separate install path. Sanitization is applied to agent body
// content to prevent YAML breakage from unescaped markdown (backticks, colons, etc.).
//
// Pure (no I/O). Uses yaml lib with lineWidth:0 + aliasDuplicateObjects:false for stable,
// parser-safe output on large agent sets.

/** YAML stringify opts: disable soft-folding, force expanded objects (no anchors). */
const YAML_OPTS = { lineWidth: 0, aliasDuplicateObjects: false } as const;

/** One `.roomodes` entry. Optional fields omitted (undefined) rather than null. */
interface RooMode {
  slug: string;
  name: string;
  roleDefinition: string;
  whenToUse?: string;
  description?: string;
  customInstructions?: string;
  groups: string[];
}

/** Key order per mode → stable snapshots. */
const MODE_KEY_ORDER: readonly (keyof RooMode)[] = [
  'slug',
  'name',
  'roleDefinition',
  'whenToUse',
  'description',
  'customInstructions',
  'groups',
];

/** Derive a Title Case display name from a kebab-case slug. */
function titleCaseFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length > 0 ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Sanitize markdown body for safe YAML block scalar embedding.
 * Normalizes CRLF → LF, trims whitespace. The `yaml` lib's block scalar encoding
 * (lineWidth:0) handles the rest — but stripping trailing whitespace per-line prevents
 * the most common parser corruption patterns.
 */
function sanitizeBodyForYaml(body: string): string {
  return body
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Split the prompt body into roleDefinition (first section content) and
 * customInstructions (remaining sections). Mirrors kilo-emitter split logic.
 */
function splitRoleAndInstructions(body: string): {
  roleDefinition: string;
  customInstructions?: string;
} {
  const normalized = sanitizeBodyForYaml(body);
  const lines = normalized.split('\n');

  const headingIdxs: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i] ?? '')) headingIdxs.push(i);
    if (headingIdxs.length === 2) break;
  }

  if (headingIdxs.length < 2) return { roleDefinition: normalized };

  const firstHeading = headingIdxs[0] ?? 0;
  const secondHeading = headingIdxs[1] ?? lines.length;

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

/** Sort agents: category asc, then slug asc. */
function sortByCategoryThenSlug(agents: readonly CanonicalAgent[]): CanonicalAgent[] {
  return [...agents].sort((a, b) => {
    const cat = a.frontmatter.category.localeCompare(b.frontmatter.category);
    return cat !== 0 ? cat : a.slug.localeCompare(b.slug);
  });
}

/** Reorder a mode into MODE_KEY_ORDER, dropping undefined optional fields. */
function orderMode(mode: RooMode): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  for (const key of MODE_KEY_ORDER) {
    const value = mode[key];
    if (value !== undefined) ordered[key] = value;
  }
  return ordered;
}

/** Build one Roo mode entry from a canonical agent. */
function toMode(agent: CanonicalAgent): RooMode {
  const fm = agent.frontmatter;
  const { roleDefinition, customInstructions } = splitRoleAndInstructions(agent.body);
  const { groups } = mapPermission(fm.permission, 'kilo'); // Roo uses same group semantics as Kilo

  const whenToUse = fm.when_to_use?.trim();

  const mode: RooMode = {
    slug: agent.slug,
    name: titleCaseFromSlug(agent.slug),
    roleDefinition,
    groups,
    description: fm.description.trim(),
  };
  if (whenToUse) mode.whenToUse = whenToUse;
  if (customInstructions !== undefined) mode.customInstructions = customInstructions;
  return mode;
}

/**
 * Roo Code AGGREGATE emitter.
 * Produces `.roomodes` — a YAML file with a `customModes:` array, compatible with Roo Code.
 */
export const rooYamlEmitter: AggregateEmitter = (
  agents: readonly CanonicalAgent[],
  _ctx: EmitContext,
): EmittedFile => {
  const modes = sortByCategoryThenSlug(agents).map(toMode);
  const content = stringifyYaml({ customModes: modes.map(orderMode) }, YAML_OPTS);

  return {
    tool: 'roo',
    relativePath: '.roomodes',
    content,
  };
};
