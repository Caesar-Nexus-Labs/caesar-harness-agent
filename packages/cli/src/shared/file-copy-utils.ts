import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getToolTargetMeta, hasAggregateEmitter, type ToolTarget } from '@caesar/agents-core';

/**
 * List every file under `dir` (recursive), returning paths relative to `dir`.
 * Returns an empty array if the directory does not exist or has no files.
 */
export function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  try {
    for (const entry of readdirSync(dir, { recursive: true }) as string[]) {
      const abs = join(dir, entry);
      if (statSync(abs).isFile()) out.push(entry);
    }
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  return out;
}

/**
 * Decide whether a built file (path relative to the tool dir) belongs to the install set.
 * - aggregate targets (agents-md, kilo): single all-agents index → always included (no split).
 * - folder-nested per-agent (openhands `{slug}/SKILL.md`): slug is the PARENT dir segment.
 * - flat per-agent (claude/gemini/copilot/…): slug = basename minus the tool extension.
 */
export function includeFile(tool: ToolTarget, relativePath: string, slugs: Set<string>): boolean {
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
