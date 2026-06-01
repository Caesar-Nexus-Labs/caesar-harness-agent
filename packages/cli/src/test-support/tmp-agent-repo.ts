import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Test support: build throwaway agent repos in the OS temp dir. Pure node:fs (no vitest import)
// so it is type-checked by tsc but never bundled by tsup (not reachable from index.ts).

/** Repo root that holds the real `agents/01-core-development` sources. */
export function realRepoRoot(): string {
  // packages/cli/src/test-support → up 4 = repo root.
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', '..', '..', '..');
}

export function realCat01Dir(): string {
  return join(realRepoRoot(), 'agents', '01-core-development');
}

/** Make an empty temp dir with a known prefix. Caller removes it. */
export function makeTmpDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/**
 * Build a temp repo containing `agents/01-core-development/` populated by copying the real
 * cat-01 sources. Returns the repo root. Extra files (e.g. a bad fixture) can be added after.
 */
export function makeTmpRepoWithCat01(): string {
  const root = makeTmpDir('caesar-cli-repo-');
  const dest = join(root, 'agents', '01-core-development');
  mkdirSync(dest, { recursive: true });
  cpSync(realCat01Dir(), dest, { recursive: true });
  return root;
}

/** Write a deliberately-invalid agent file (bad frontmatter + missing body) into a repo. */
export function writeBadAgent(root: string, category = '01-core-development'): string {
  const dir = join(root, 'agents', category);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'broken-agent.md');
  // Missing required schema fields + no canonical body sections → parseAgentFile throws.
  writeFileSync(path, '---\nname: broken-agent\n---\n\nNo required sections here.\n', 'utf8');
  return path;
}
