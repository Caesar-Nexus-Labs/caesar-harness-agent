import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { EmittedFile } from './emitters/core/emitter-interface.js';
import { isToolTarget } from './mapping/tool-targets.js';

// Filesystem sink for emitted files. Kept SEPARATE from the pure engine so emit/transpile
// stay testable without touching disk. Writes ONLY under `<distRoot>/<tool>/<relativePath>`.
//
// SECURITY: emitted content is data, never executed. Each target path is resolved and
// asserted to stay within its tool root — any `..` traversal or absolute relativePath
// that escapes the root is rejected before any write happens.

export class OutputPathError extends Error {
  readonly tool: string;
  readonly relativePath: string;

  constructor(tool: string, relativePath: string, reason: string) {
    super(`Refusing to write "${relativePath}" for tool "${tool}": ${reason}`);
    this.name = 'OutputPathError';
    this.tool = tool;
    this.relativePath = relativePath;
  }
}

export interface WriteOutputsResult {
  /** Absolute paths actually written, in input order. */
  written: string[];
}

/** Resolve + assert a target stays within `root`; throws OutputPathError on escape. */
function resolveWithinRoot(root: string, tool: string, relativePath: string): string {
  if (isAbsolute(relativePath)) {
    throw new OutputPathError(tool, relativePath, 'absolute paths are not allowed');
  }
  const target = resolve(root, relativePath);
  const rel = relative(root, target);
  // Escapes the root if the relative path climbs out (`..`) or resolves to an absolute path.
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new OutputPathError(tool, relativePath, 'path escapes the tool output root');
  }
  return target;
}

/**
 * Write emitted files under `<distRoot>/<tool>/<relativePath>`, creating dirs as needed.
 * Validates ALL paths first (fail-fast, no partial writes on a traversal attempt).
 *
 * @param files emitted files from `transpile()`.
 * @param distRoot build output root (e.g. absolute path to `dist`).
 */
export function writeOutputs(files: readonly EmittedFile[], distRoot: string): WriteOutputsResult {
  const root = resolve(distRoot);

  // Pass 1: validate every target path before touching the filesystem.
  const targets = files.map((f) => {
    // Guard the tool segment itself — it forms a path component, so a malformed
    // tool value (buggy emitter) must not become a traversal vector.
    if (!isToolTarget(f.tool)) {
      throw new OutputPathError(String(f.tool), f.relativePath, 'unknown tool target');
    }
    const toolRoot = join(root, f.tool);
    return { abs: resolveWithinRoot(toolRoot, f.tool, f.relativePath), content: f.content };
  });

  // Pass 2: write.
  const written: string[] = [];
  for (const t of targets) {
    mkdirSync(dirname(t.abs), { recursive: true });
    writeFileSync(t.abs, t.content, 'utf8');
    written.push(t.abs);
  }

  return { written };
}
