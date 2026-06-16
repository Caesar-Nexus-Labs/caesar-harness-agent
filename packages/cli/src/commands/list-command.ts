import { listEntries, readLock } from '../caesar-lock.js';
import type { ListResult } from '../command-results.js';
import { resolveGlobalCaesarDir } from '../resolve-global-path.js';

export interface ListOptions {
  cwd?: string;
  global?: boolean;
  all?: boolean;
}

export function runList(options: ListOptions): ListResult {
  const cwd = options.cwd ?? process.cwd();

  const readProject = options.all || !options.global;
  const readGlobal = options.all || options.global;

  const entries: ListResult['entries'] = [];
  let projectLockPath: string | undefined;
  let globalLockPath: string | undefined;

  if (readProject) {
    try {
      const lock = readLock(cwd);
      // readLock doesn't provide path, but it's cwd/caesar.lock
      projectLockPath = cwd;
      const projectEntries = listEntries(lock, 'project');
      entries.push(
        ...projectEntries.map((e) => ({
          name: e.name,
          version: e.version,
          source: e.source,
          scope: e.scope,
          installedTools: e.installedTools,
          installedAt: e.installedAt,
        })),
      );
    } catch {
      // Ignore if absent or invalid
    }
  }

  if (readGlobal) {
    try {
      const gDir = resolveGlobalCaesarDir();
      const lock = readLock(gDir);
      globalLockPath = gDir;
      const globalEntries = listEntries(lock, 'global');
      entries.push(
        ...globalEntries.map((e) => ({
          name: e.name,
          version: e.version,
          source: e.source,
          scope: e.scope,
          installedTools: e.installedTools,
          installedAt: e.installedAt,
        })),
      );
    } catch {
      // Ignore
    }
  }

  entries.sort((a, b) => new Date(b.installedAt).getTime() - new Date(a.installedAt).getTime());

  return {
    entries,
    projectLockPath,
    globalLockPath,
  };
}
