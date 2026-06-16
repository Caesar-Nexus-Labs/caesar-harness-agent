import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { TOOL_TARGETS, type ToolTarget } from '@caesar/agents-core';
import { resolveGlobalToolDir } from '../resolve-global-path.js';

/**
 * Scans the workspace (local) and user profile home directory (global) to detect
 * which target AI tools are active.
 *
 * SECURITY: This module ONLY performs read-only file/folder existence checks.
 * It never executes system commands or scans the PATH to avoid command injection risks.
 */
export function detectActiveTools(cwd: string): ToolTarget[] {
  const active = new Set<ToolTarget>();
  const h = homedir();

  // 1. Local Workspace detection
  if (existsSync(resolve(cwd, '.claude'))) active.add('claude');
  if (existsSync(resolve(cwd, '.opencode'))) active.add('opencode');
  if (existsSync(resolve(cwd, '.kiro'))) active.add('kiro');
  if (existsSync(resolve(cwd, '.codex'))) active.add('codex');
  if (existsSync(resolve(cwd, '.factory'))) active.add('factory');
  if (existsSync(resolve(cwd, '.github/agents')) || existsSync(resolve(cwd, '.github'))) {
    active.add('copilot');
  }
  if (existsSync(resolve(cwd, '.agents/skills')) || existsSync(resolve(cwd, '.agents'))) {
    active.add('openhands');
  }
  if (existsSync(resolve(cwd, '.gemini'))) active.add('gemini');
  if (existsSync(resolve(cwd, '.kilocodemodes')) || existsSync(resolve(cwd, '.kilocode'))) {
    active.add('kilo');
  }

  // Fallbacks: if we detect Cursor, Windsurf, or Cline folders/files, we add agents-md
  if (
    existsSync(resolve(cwd, 'AGENTS.md')) ||
    existsSync(resolve(cwd, '.cursor')) ||
    existsSync(resolve(cwd, '.windsurf')) ||
    existsSync(resolve(cwd, '.clinerules'))
  ) {
    active.add('agents-md');
  }

  // 2. Global detection (checking config folders in home/appdata)
  for (const tool of TOOL_TARGETS) {
    if (tool === 'copilot' || tool === 'agents-md') continue;

    // Check if the specific global tool directory exists
    const toolGlobalDir = resolveGlobalToolDir(tool);
    if (toolGlobalDir && existsSync(toolGlobalDir)) {
      active.add(tool);
      continue;
    }

    // Check parent config folders as a fallback
    let parentDir: string | undefined;
    if (tool === 'claude') parentDir = join(h, '.claude');
    else if (tool === 'kiro') parentDir = join(h, '.kiro');
    else if (tool === 'codex') parentDir = join(h, '.codex');
    else if (tool === 'factory') parentDir = join(h, '.factory');
    else if (tool === 'gemini') parentDir = join(h, '.gemini');
    else if (tool === 'kilo') parentDir = join(h, '.kilocode');
    else if (tool === 'openhands') parentDir = join(h, '.agents');

    if (parentDir && existsSync(parentDir)) {
      active.add(tool);
    }
  }

  return Array.from(active);
}
