import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ToolTarget } from '@caesar/agents-core';

/**
 * Returns the platform-appropriate directory for Caesar's global configuration
 * (where caesar.lock is stored for global installs).
 */
export function resolveGlobalCaesarDir(): string {
  if (process.env.CAESAR_GLOBAL_DIR) {
    return resolve(process.env.CAESAR_GLOBAL_DIR);
  }
  const { platform } = process;
  if (platform === 'win32') {
    return join(process.env.APPDATA ?? homedir(), 'Caesar');
  }
  if (platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'Caesar');
  }
  // Linux and other Unix-like systems
  const xdgData = process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share');
  return join(xdgData, 'caesar');
}

/**
 * Resolves the platform-appropriate global directory for OpenCode agents.
 */
function resolveOpenCodeGlobalDir(): string {
  if (process.env.CAESAR_GLOBAL_DIR) {
    return join(resolve(process.env.CAESAR_GLOBAL_DIR), 'opencode', 'agents');
  }
  const { platform } = process;
  if (platform === 'win32') {
    return join(process.env.APPDATA ?? homedir(), 'opencode', 'agents');
  }
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
  return join(xdgConfig, 'opencode', 'agents');
}

/**
 * Returns the global directory where agents should be installed for a specific tool.
 * Returns undefined if the tool does not support a global agent directory.
 */
export function resolveGlobalToolDir(tool: ToolTarget): string | undefined {
  const h = process.env.CAESAR_GLOBAL_DIR ? resolve(process.env.CAESAR_GLOBAL_DIR) : homedir();

  switch (tool) {
    case 'claude':
      return join(h, '.claude', 'agents');
    case 'opencode':
      return resolveOpenCodeGlobalDir();
    case 'kiro':
      return join(h, '.kiro', 'agents');
    case 'codex':
      return join(h, '.codex', 'agents');
    case 'factory':
      return join(h, '.factory', 'droids');
    case 'gemini':
      return join(h, '.gemini', 'agents');
    case 'openhands':
      return join(h, '.agents', 'skills');
    case 'kilo':
      return join(h, '.kilocode');
    case 'copilot':
      return undefined;
    case 'agents-md':
      return undefined;
    default:
      return undefined;
  }
}
