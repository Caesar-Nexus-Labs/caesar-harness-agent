import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  discoverAgents,
  getToolTargetMeta,
  hasAggregateEmitter,
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

/** List every file under `dir` (recursive), returning paths relative to `dir`. */
function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { recursive: true }) as string[]) {
    const abs = join(dir, entry);
    if (statSync(abs).isFile()) out.push(entry);
  }
  return out;
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

/**
 * Decide whether a built file (path relative to the tool dir) belongs to the install set.
 * - aggregate targets (agents-md, kilo): single all-agents index → always included (no split).
 * - folder-nested per-agent (openhands `{slug}/SKILL.md`): slug is the PARENT dir segment.
 * - flat per-agent (claude/gemini/copilot/…): slug = basename minus the tool extension.
 */
function includeFile(tool: ToolTarget, relativePath: string, slugs: Set<string>): boolean {
  // Aggregate indexes are copied whole (copy regardless of slug).
  if (hasAggregateEmitter(tool)) return true;

  const segs = relativePath.split(/[\\/]/);
  const base = segs.at(-1) ?? relativePath;

  // Folder-per-agent (openhands): `.agents/skills/{slug}/SKILL.md` → slug is the parent dir.
  if (base === 'SKILL.md') return slugs.has(segs.at(-2) ?? '');

  // Flat per-agent: slug = basename minus the tool extension (handles copilot `.agent.md`).
  const ext = getToolTargetMeta(tool).fileExtension;
  if (!base.endsWith(ext)) return false;
  return slugs.has(base.slice(0, base.length - ext.length));
}
