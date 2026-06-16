import { existsSync, rmdirSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import { readLock, removeEntry, writeLock } from '../caesar-lock.js';
import { PluginNotFoundError, UsageError } from '../cli-errors.js';
import type { RemoveResult } from '../command-results.js';
import { resolveGlobalCaesarDir, resolveGlobalToolDir } from '../resolve-global-path.js';

export interface RemoveOptions {
  name: string;
  tool?: string[];
  global?: boolean;
  force?: boolean;
  dryRun?: boolean;
  cwd?: string;
}

export function runRemove(options: RemoveOptions): RemoveResult {
  const cwd = options.cwd ?? process.cwd();

  if (!options.name || options.name.trim() === '') {
    throw new UsageError('Missing <name>. Usage: caesar remove <name>');
  }

  const isGlobal = options.global === true;
  const isDryRun = options.dryRun === true;
  const lockDir = isGlobal ? resolveGlobalCaesarDir() : cwd;

  const lock = readLock(lockDir);
  const scope = isGlobal ? 'global' : 'project';

  // Find entry by name and scope
  let pluginEntryKey: string | undefined;
  for (const [key, entry] of Object.entries(lock.plugins)) {
    if (entry.name === options.name && entry.scope === scope) {
      pluginEntryKey = key;
      break;
    }
  }

  const pluginEntry = pluginEntryKey ? lock.plugins[pluginEntryKey] : undefined;

  if (!pluginEntry) {
    if (options.force) {
      return {
        name: options.name,
        scope,
        dryRun: isDryRun,
        removedPaths: [],
        skippedPaths: [],
      };
    }
    throw new PluginNotFoundError(`Plugin ${options.name} is not installed in ${scope} scope`);
  }

  const removedPaths: string[] = [];
  const skippedPaths: string[] = [];

  // We remove files based on `installedPaths` recorded in the lockfile.
  // Note: the original paths were absolute.
  // Wait! In Phase 6 I recorded them as absolute paths in `copiedPaths`.
  // Let's verify `isWithin` logic.

  const validRoots: string[] = [];
  if (isGlobal) {
    for (const tool of pluginEntry.installedTools) {
      const gDir = resolveGlobalToolDir(tool);
      if (gDir) validRoots.push(gDir);
    }
  } else {
    validRoots.push(cwd);
  }

  for (const absPath of pluginEntry.installedPaths) {
    // Security check: must be inside one of the valid tool directories
    const isSafe = validRoots.some((root) => absPath.startsWith(root));
    if (!isSafe) {
      throw new UsageError(`Path traversal attempt detected in lockfile: ${absPath}`);
    }

    if (existsSync(absPath)) {
      if (!isDryRun) {
        unlinkSync(absPath);

        // For openhands which uses folder-per-agent, attempt to prune empty parent
        const parent = dirname(absPath);
        try {
          rmdirSync(parent); // will throw ENOTEMPTY if other agents are there, we ignore
        } catch (_e: any) {
          // ignore
        }
      }
      removedPaths.push(absPath);
    } else {
      skippedPaths.push(absPath);
    }
  }

  if (!isDryRun) {
    const updatedLock = removeEntry(lock, pluginEntry.name, pluginEntry.version, pluginEntry.scope);
    writeLock(lockDir, updatedLock);
  }

  return {
    name: options.name,
    scope: isGlobal ? 'global' : 'project',
    dryRun: isDryRun,
    removedPaths,
    skippedPaths,
  };
}
