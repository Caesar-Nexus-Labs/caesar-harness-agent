import type { AgentFileDescriptor } from '@caesar/agents-core';
import {
  hasAggregateEmitter,
  isToolTarget,
  TOOL_TARGETS,
  type ToolTarget,
} from '@caesar/agents-core';
import { UsageError } from './cli-errors.js';

// Pure selection helpers: validate user-supplied tool names against the registry and filter
// discovered agents by category. No I/O. Category dir names are `NN-kebab`; a filter matches
// the full name (`01-core-development`), the numeric prefix (`01`), or the slug (`core-development`).

/**
 * Resolve the requested tool set. Empty/undefined → all TOOL_TARGETS (default).
 * Throws UsageError on any unknown tool name (→ exit 2).
 */
export function resolveTools(requested?: readonly string[]): ToolTarget[] {
  if (requested === undefined || requested.length === 0) return [...TOOL_TARGETS];
  const out: ToolTarget[] = [];
  for (const name of requested) {
    if (!isToolTarget(name)) {
      throw new UsageError(`Unknown tool "${name}". Valid tools: ${TOOL_TARGETS.join(', ')}.`);
    }
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

/**
 * Split native (per-agent) vs fallback (aggregate) tools by REGISTRY membership.
 * A tool with a registered AGGREGATE emitter (agents-md, kilo) routes to the aggregate path;
 * everything else routes to per-agent native. Dispatch is by registry, NOT by tier metadata or
 * a hard-coded tool name — so a new aggregate target (e.g. kilo) is handled without edits here.
 *
 * REQUIRES emitters to be registered BEFORE this runs (callers register, then split).
 */
export function splitToolsByTier(tools: readonly ToolTarget[]): {
  native: ToolTarget[];
  fallback: ToolTarget[];
} {
  const native: ToolTarget[] = [];
  const fallback: ToolTarget[] = [];
  for (const tool of tools) {
    if (hasAggregateEmitter(tool)) fallback.push(tool);
    else native.push(tool);
  }
  return { native, fallback };
}

/** True if a `NN-kebab` category dir name matches a single user filter token. */
export function categoryMatches(category: string, filter: string): boolean {
  if (category === filter) return true;
  const dash = category.indexOf('-');
  if (dash <= 0) return false;
  const prefix = category.slice(0, dash); // "01"
  const slug = category.slice(dash + 1); // "core-development"
  if (filter === prefix || filter === slug) return true;
  // Tolerate a CLI parser coercing "01" → "1" (mri strips leading zeros from numeric args).
  if (/^\d+$/.test(filter) && /^\d+$/.test(prefix) && Number(filter) === Number(prefix)) {
    return true;
  }
  return false;
}

/**
 * Filter discovered agents by `--category` tokens. Empty filters → keep all.
 * Throws UsageError if a filter token matches no discovered category (typo guard → exit 2).
 */
export function filterByCategory(
  descriptors: readonly AgentFileDescriptor[],
  filters?: readonly string[],
): AgentFileDescriptor[] {
  if (filters === undefined || filters.length === 0) return [...descriptors];
  const matched = descriptors.filter((d) => filters.some((f) => categoryMatches(d.category, f)));
  for (const f of filters) {
    if (!descriptors.some((d) => categoryMatches(d.category, f))) {
      const known = [...new Set(descriptors.map((d) => d.category))].sort().join(', ');
      throw new UsageError(`No agents match category "${f}". Known categories: ${known}.`);
    }
  }
  return matched;
}
