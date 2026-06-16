import { existsSync, statSync } from 'node:fs';
import { dirname, isAbsolute, parse, relative, resolve, sep } from 'node:path';

// Path resolution for the CLI. Locates the repo root (the dir containing `agents/`) by
// walking up from a start dir, and derives the default build-output root. Also provides a
// traversal-safe containment check used by `install` so writes never escape `--dest`.
//
// SECURITY: `isWithin` is the guard for install's copy target; write-outputs.ts already
// guards build. Cross-platform via node:path only (no separator assumptions).

/** True if `child` resolves to `parent` or a path nested under it. */
export function isWithin(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

/**
 * Walk up from `startDir` to find the repo root: the nearest ancestor with an `agents/`
 * directory. Returns the matched dir, or undefined if none found before the filesystem root.
 */
export function findRepoRoot(startDir: string): string | undefined {
  let current = resolve(startDir);
  const { root } = parse(current);
  for (;;) {
    const agentsDir = resolve(current, 'agents');
    if (existsSync(agentsDir) && statSync(agentsDir).isDirectory()) return current;
    if (current === root) return undefined;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

export interface ResolvedPaths {
  /** Repo root (contains `agents/`). */
  root: string;
  /** Canonical agent sources dir: `<root>/agents`. */
  agentsDir: string;
}

/**
 * Resolve repo paths from an explicit `--root` (if given) or by walking up from `cwd`.
 * Throws when no `agents/` tree can be located (caller maps to a usage error).
 */
export function resolvePaths(cwd: string, rootOverride?: string): ResolvedPaths {
  const root = rootOverride !== undefined ? resolve(rootOverride) : findRepoRoot(cwd);
  if (root === undefined || !existsSync(resolve(root, 'agents'))) {
    throw new Error(
      'Could not locate an "agents/" directory. Run inside the Caesar Harness Agent repo or pass --root <path>.',
    );
  }
  return { root, agentsDir: resolve(root, 'agents') };
}

/** Default build-output root: `<root>/dist` unless `--out` overrides (resolved vs cwd). */
export function resolveOutRoot(root: string, cwd: string, outOverride?: string): string {
  if (outOverride === undefined) return resolve(root, 'dist');
  return isAbsolute(outOverride) ? resolve(outOverride) : resolve(cwd, outOverride);
}
