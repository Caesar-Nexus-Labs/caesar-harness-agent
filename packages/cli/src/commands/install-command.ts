import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  discoverAgents,
  isToolTarget,
  registerExtendedNativeEmitters,
  registerFallbackEmitters,
  registerNativeEmitters,
  type ToolTarget,
} from '@caesar/agents-core';
import { categoryMatches } from '../agent-selection.js';
import { BuildNotFoundError, UsageError } from '../cli-errors.js';
import type { InstallResult } from '../command-results.js';
import { isWithin, resolveOutRoot, resolvePaths } from '../resolve-paths.js';
import { includeFile, listFilesRecursive } from '../shared/file-copy-utils.js';

// install: copy built <out>/{tool}/ artifacts for a category into --dest (default CWD).
// Native per-agent files are filtered to the category's slugs; aggregate indexes (agents-md,
// kilo) are copied whole (single all-agents file, not per-category). Folder-nested per-agent
// files (openhands `{slug}/SKILL.md`) derive their slug from the parent dir segment. Refuses to
// clobber an existing file without --force; never writes outside --dest (isWithin guard).

export interface InstallOptions {
  /** Category token: `NN`, `NN-name`, or `name` (required). */
  category?: string;
  tool?: string;
  dest?: string;
  out?: string;
  force?: boolean;
  root?: string;
  cwd?: string;
}

export function runInstall(options: InstallOptions = {}): InstallResult {
  const cwd = options.cwd ?? process.cwd();

  const category = options.category;
  if (category === undefined || category.trim() === '') {
    throw new UsageError('Missing <category>. Usage: caesar install <category> --tool <t>.');
  }
  const toolName = options.tool;
  if (toolName === undefined || toolName.trim() === '') {
    throw new UsageError('Missing required --tool <t>.');
  }
  if (!isToolTarget(toolName)) {
    throw new UsageError(`Unknown tool "${toolName}".`);
  }
  const tool: ToolTarget = toolName;

  const { root } = resolvePaths(cwd, options.root);
  const outRoot = resolveOutRoot(root, cwd, options.out);
  const toolDir = resolve(outRoot, tool);

  // Register emitters so includeFile's hasAggregateEmitter() routing is accurate (idempotent).
  registerNativeEmitters();
  registerExtendedNativeEmitters();
  registerFallbackEmitters();

  if (!existsSync(toolDir)) {
    throw new BuildNotFoundError(
      `No built artifacts for tool "${tool}" at ${toolDir}.`,
      `Run "caesar build --tool ${tool}" first.`,
    );
  }

  const dest = options.dest !== undefined ? resolve(cwd, options.dest) : cwd;
  const force = options.force === true;

  const slugs = categorySlugs(root, category);
  const files = listFilesRecursive(toolDir).filter((rel) => includeFile(tool, rel, slugs));

  const copied: string[] = [];
  const skipped: string[] = [];
  for (const rel of files) {
    const target = resolve(dest, rel);
    if (!isWithin(dest, target)) {
      throw new UsageError(`Refusing to write outside --dest: ${rel}`);
    }
    if (existsSync(target) && !force) {
      skipped.push(target);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(toolDir, rel), target);
    copied.push(target);
  }

  return { tool, category, dest, copied, skipped, force };
}

/** Discover the set of agent slugs that belong to `category` (throws UsageError on no match). */
function categorySlugs(root: string, category: string): Set<string> {
  const matched = discoverAgents(root).filter((d) => categoryMatches(d.category, category));
  if (matched.length === 0) {
    throw new UsageError(`No agents found for category "${category}".`);
  }
  return new Set(matched.map((d) => d.slug));
}
