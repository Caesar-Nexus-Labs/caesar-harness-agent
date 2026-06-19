import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  type CanonicalAgent,
  discoverAgents,
  type EmitContext,
  type EmittedFile,
  parseAgentFile,
  registerExtendedNativeEmitters,
  registerFallbackEmitters,
  registerMultiFormatEmitters,
  registerNativeEmitters,
  type ToolTarget,
  transpile,
  transpileAggregate,
  writeOutputs,
} from '@caesar/agents-core';
import { filterByCategory, resolveTools, splitToolsByTier } from '../agent-selection.js';
import type { BuildResult, ValidationFailure } from '../command-results.js';
import { extractIssues } from '../extract-issues.js';
import { resolveOutRoot, resolvePaths } from '../resolve-paths.js';

// build: discover → filter by category → parse → transpile (native per-agent, fallback
// aggregate) → write to <out>/{tool}/. THIN: every transform is an agents-core call; this
// file only orchestrates ordering, collects parse failures, and tallies what was written.

export interface BuildOptions {
  tool?: string[];
  category?: string[];
  modelProvider?: string;
  out?: string;
  root?: string;
  /** Working dir to resolve repo + relative --out from (defaults to process.cwd()). */
  cwd?: string;
}

/** Group emitted-file absolute paths by their tool segment for reporting. */
function groupWritten(
  files: readonly EmittedFile[],
  written: readonly string[],
): Record<string, string[]> {
  const byTool: Record<string, string[]> = {};
  files.forEach((file, i) => {
    const abs = written[i];
    if (abs === undefined) return;
    const bucket = byTool[file.tool] ?? [];
    bucket.push(abs);
    byTool[file.tool] = bucket;
  });
  return byTool;
}

export function runBuild(options: BuildOptions = {}): BuildResult {
  const cwd = options.cwd ?? process.cwd();
  const { root } = resolvePaths(cwd, options.root);
  const outRoot = resolveOutRoot(root, cwd, options.out);
  const tools = resolveTools(options.tool);

  // Register emitters + their output validators (idempotent) BEFORE the tier split, which
  // routes by registry membership (hasAggregateEmitter). Native (6) + extended (gemini,
  // openhands, kilo) + fallback aggregate. Order matters: split must see the aggregates.
  registerNativeEmitters();
  registerExtendedNativeEmitters();
  registerMultiFormatEmitters();
  registerFallbackEmitters();

  const { native, fallback } = splitToolsByTier(tools);

  const descriptors = filterByCategory(discoverAgents(root), options.category);

  // Parse every source first; collect failures so build aborts cleanly before any write.
  const agents: CanonicalAgent[] = [];
  const parseFailures: ValidationFailure[] = [];
  for (const d of descriptors) {
    try {
      agents.push(parseAgentFile(d.path));
    } catch (err) {
      parseFailures.push({
        path: d.path,
        issues: extractIssues(err),
      });
    }
  }

  if (parseFailures.length > 0) {
    return {
      outRoot,
      tools,
      agentCount: agents.length,
      writtenByTool: {},
      skipped: [],
      parseFailures,
      fileCount: 0,
    };
  }

  const ctx: EmitContext = { distRoot: outRoot };
  if (options.modelProvider !== undefined) ctx.modelProvider = options.modelProvider;

  // Per-agent native emit, then a single aggregate pass for fallback tools over the whole set.
  const emitted: EmittedFile[] = [];
  const skipped = new Set<ToolTarget>();
  if (native.length > 0) {
    for (const agent of agents) {
      const result = transpile(agent, native, ctx);
      emitted.push(...result.files);
      for (const s of result.skipped) skipped.add(s);
    }
  }
  if (fallback.length > 0 && agents.length > 0) {
    const result = transpileAggregate(agents, fallback, ctx);
    emitted.push(...result.files);
    for (const s of result.skipped) skipped.add(s);
  }

  const { written } = writeOutputs(emitted, outRoot);
  const writtenByTool = groupWritten(emitted, written);

  // Sync to root for GitHub Marketplace (Claude Add Marketplace support)
  // Only copy when outRoot is the default dist directory (skip during test builds)
  if (outRoot === join(root, 'dist')) {
    if (tools.includes('claude')) {
      const srcAgents = join(outRoot, 'claude', '.claude', 'agents');
      const destAgents = join(root, 'claude-agents');
      if (existsSync(srcAgents)) {
        rmSync(destAgents, { recursive: true, force: true });
        mkdirSync(destAgents, { recursive: true });
        cpSync(srcAgents, destAgents, { recursive: true });
      }
    }
    if (tools.includes('claude-plugin')) {
      const srcPlugin = join(outRoot, 'claude-plugin', '.claude-plugin');
      const destPlugin = join(root, '.claude-plugin');
      if (existsSync(srcPlugin)) {
        rmSync(destPlugin, { recursive: true, force: true });
        mkdirSync(destPlugin, { recursive: true });
        cpSync(srcPlugin, destPlugin, { recursive: true });
      }
    }
  }

  return {
    outRoot,
    tools,
    agentCount: agents.length,
    writtenByTool,
    skipped: [...skipped],
    parseFailures,
    fileCount: written.length,
  };
}
