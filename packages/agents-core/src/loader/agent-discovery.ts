import { basename, dirname } from 'node:path';
import fastGlob from 'fast-glob';

/** A discovered agent source file (not yet parsed). */
export interface AgentFileDescriptor {
  path: string;
  /** Category dir name: NN-kebab. */
  category: string;
  /** Filename without .md. */
  slug: string;
}

/**
 * Discover canonical agent files under `{rootDir}/agents/NN-*\/*.md`.
 * Cross-platform (fast-glob normalizes separators). Restricted to the agents/ tree.
 */
export function discoverAgents(rootDir: string): AgentFileDescriptor[] {
  const pattern = 'agents/[0-9][0-9]-*/*.md';
  const matches = fastGlob.sync(pattern, {
    cwd: rootDir,
    absolute: true,
    onlyFiles: true,
    ignore: ['**/.gitkeep', '**/_template/**'],
  });

  return matches.map((path) => ({
    path,
    category: basename(dirname(path)),
    slug: basename(path, '.md'),
  }));
}
