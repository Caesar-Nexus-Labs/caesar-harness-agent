import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import readline from 'node:readline';
import {
  getToolTargetMeta,
  isToolTarget,
  registerExtendedNativeEmitters,
  registerFallbackEmitters,
  registerNativeEmitters,
  TOOL_TARGETS,
  type ToolTarget,
} from '@caesar/agents-core';
import { addEntry, readLock, writeLock } from '../caesar-lock.js';
import { UsageError } from '../cli-errors.js';
import type { AddResult } from '../command-results.js';
import { parseSource, resolveSource } from '../plugin-source.js';
import { resolveGlobalCaesarDir, resolveGlobalToolDir } from '../resolve-global-path.js';
import { includeFile, listFilesRecursive } from '../shared/file-copy-utils.js';
import { detectActiveTools } from '../shared/tool-detector.js';

export interface AddOptions {
  source: string;
  tool?: string[];
  category?: string[];
  global?: boolean;
  force?: boolean;
  dryRun?: boolean;
  cwd?: string;
}

function askInteractive(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.on('SIGINT', () => {
      rl.close();
      process.exit(130);
    });

    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function runAdd(options: AddOptions): Promise<AddResult> {
  const cwd = options.cwd ?? process.cwd();

  const rawSource = options.source;
  if (!rawSource || rawSource.trim() === '') {
    throw new UsageError('Missing <source>. Usage: caesar add <source>');
  }

  // Parse and resolve source
  const source = parseSource(rawSource);
  const plugin = await resolveSource(source, { cwd });

  try {
    // Resolve tools
    let tools: ToolTarget[];
    if (options.tool && options.tool.length > 0) {
      tools = resolveInstallTargets(options.tool);
    } else {
      const detected = detectActiveTools(cwd);
      if (process.stdout.isTTY) {
        if (detected.length > 0) {
          const ans = await askInteractive(
            `Detected active tools: ${detected.join(', ')}. Install for these? (Y/n): `,
          );
          if (ans === '' || ans.toLowerCase() === 'y' || ans.toLowerCase() === 'yes') {
            tools = detected;
          } else {
            const listAns = await askInteractive(
              `Enter tools to install (comma-separated, or press Enter for 'all'): `,
            );
            if (listAns === '') {
              tools = [...TOOL_TARGETS];
            } else {
              const selected = listAns.split(',').map((s) => s.trim());
              tools = resolveInstallTargets(selected);
            }
          }
        } else {
          tools = [...TOOL_TARGETS];
        }
      } else {
        // Non-interactive (CI/CD)
        if (detected.length > 0) {
          tools = detected;
        } else {
          // No active tools and non-interactive -> no-op to prevent CI/CD workspace pollution
          return {
            source: rawSource,
            name: plugin.name,
            version: plugin.version,
            scope: options.global ? 'global' : 'project',
            dryRun: options.dryRun === true,
            installedTools: [],
            copiedPaths: [],
            skippedPaths: [],
            lockUpdated: false,
          };
        }
      }
    }

    // Resolve categories
    const categories = options.category ?? [];
    // Category filtering based on the manifest agentSlugs
    // If no categories passed, we install everything.
    // Wait, the plan says: "category filter (e.g. --category lang) installs only matching agents."
    // Phase 1 PluginManifest: has categories: string[] and agentSlugs: string[].
    // If the plugin has agents, maybe we don't need to filter by category if they are all in one package?
    // Actually, Phase 6 architecture step: `includeFile() filter (category slugs or all)`
    let slugsToInstall: Set<string> | undefined;
    if (categories.length > 0) {
      if (!plugin.manifest.agentSlugs || plugin.manifest.agentSlugs.length === 0) {
        throw new UsageError(
          `Cannot filter by category: plugin ${plugin.name} does not expose agentSlugs`,
        );
      }
      // Simplification for v1: if filtering by category, we need to know which slug belongs to which category.
      // But the plugin manifest just lists `categories` and `agentSlugs`. It doesn't map slug -> category.
      // So if a category filter is provided, we just check if the plugin's `categories` array includes it.
      // If yes, install all agentSlugs. If no, throw.
      const match = categories.some((cat) => plugin.manifest.categories.includes(cat));
      if (!match) {
        throw new UsageError(`Plugin ${plugin.name} does not belong to requested categories`);
      }
      slugsToInstall = new Set(plugin.manifest.agentSlugs);
    } else if (plugin.manifest.agentSlugs && plugin.manifest.agentSlugs.length > 0) {
      slugsToInstall = new Set(plugin.manifest.agentSlugs);
    }

    const isGlobal = options.global === true;
    const force = options.force === true;
    const isDryRun = options.dryRun === true;

    // We must register emitters for `includeFile` (specifically `hasAggregateEmitter`) to work.
    registerNativeEmitters();
    registerExtendedNativeEmitters();
    registerFallbackEmitters();

    const copiedPaths: string[] = [];
    const skippedPaths: string[] = [];
    const installedToolsSet = new Set<ToolTarget>();

    for (const tool of tools) {
      if (!plugin.manifest.supportedTools.includes(tool)) {
        continue;
      }

      const meta = getToolTargetMeta(tool);
      let toolDestDir: string | undefined;

      if (isGlobal) {
        toolDestDir = resolveGlobalToolDir(tool);
        if (!toolDestDir) continue; // Tool doesn't support global install
      } else {
        toolDestDir = cwd;
      }

      const toolSrcDir = join(plugin.distDir, tool);
      if (!existsSync(toolSrcDir)) {
        continue; // No artifacts for this tool
      }

      const files = listFilesRecursive(toolSrcDir);
      let copiedForTool = false;

      for (const rel of files) {
        if (slugsToInstall && !includeFile(tool, rel, slugsToInstall)) {
          continue;
        }

        let targetPath: string;
        if (isGlobal) {
          // 'rel' includes meta.outputSubdir (e.g. '.opencode/agents/xyz.md')
          // We need to strip it to get the path within the global dir
          let relWithinAgentDir = rel;
          // Normalize paths for matching just in case (windows vs posix)
          const outputSubdir = meta.outputSubdir.replace(/\//g, sep);
          if (rel.startsWith(outputSubdir + sep)) {
            relWithinAgentDir = rel.substring(outputSubdir.length + 1);
          } else if (rel === outputSubdir || rel === meta.outputSubdir) {
            // Aggregate file like .kilocodemodes
            relWithinAgentDir = '';
          }

          targetPath = relWithinAgentDir ? resolve(toolDestDir, relWithinAgentDir) : toolDestDir;
        } else {
          targetPath = resolve(toolDestDir, rel);
        }

        // Security / safety check:
        if (!targetPath.startsWith(isGlobal ? toolDestDir : cwd)) {
          throw new UsageError(`Refusing to write outside destination: ${rel}`);
        }

        if (existsSync(targetPath) && !force) {
          skippedPaths.push(targetPath);
          continue;
        }

        if (!isDryRun) {
          mkdirSync(dirname(targetPath), { recursive: true });
          copyFileSync(join(toolSrcDir, rel), targetPath);
        }

        copiedPaths.push(targetPath);
        copiedForTool = true;
      }

      if (copiedForTool) {
        installedToolsSet.add(tool);
      }
    }

    const installedTools = Array.from(installedToolsSet);
    let lockUpdated = false;

    if (!isDryRun && installedTools.length > 0) {
      const lockDir = isGlobal ? resolveGlobalCaesarDir() : cwd;

      // Ensure lock dir exists (especially for global)
      if (!existsSync(lockDir)) {
        mkdirSync(lockDir, { recursive: true });
      }

      let lock = readLock(lockDir);
      lock = addEntry(lock, {
        name: plugin.name,
        version: plugin.version,
        source: plugin.source.type,
        resolved:
          plugin.source.type === 'local'
            ? plugin.source.path
            : plugin.source.type === 'npm'
              ? `npm:${plugin.name}`
              : `github:${(plugin.source as any).owner}/${(plugin.source as any).repo}`,
        integrity: plugin.integrity,
        installedTools,
        installedPaths: copiedPaths,
        scope: isGlobal ? 'global' : 'project',
        installedAt: new Date().toISOString(),
      });
      writeLock(lockDir, lock);
      lockUpdated = true;
    }

    return {
      source: rawSource,
      name: plugin.name,
      version: plugin.version,
      scope: isGlobal ? 'global' : 'project',
      dryRun: isDryRun,
      installedTools,
      copiedPaths,
      skippedPaths,
      lockUpdated,
    };
  } finally {
    plugin.cleanup();
  }
}

function resolveInstallTargets(tools: string[] | undefined): ToolTarget[] {
  if (tools === undefined || tools.includes('all')) return [...TOOL_TARGETS];
  const validTools: ToolTarget[] = [];
  for (const t of tools) {
    if (isToolTarget(t)) validTools.push(t);
    else throw new UsageError(`Unknown tool target: ${t}`);
  }
  return validTools;
}
