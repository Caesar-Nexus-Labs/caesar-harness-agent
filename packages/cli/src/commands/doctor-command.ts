import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ToolTarget } from '@caesar/agents-core';
import { readLock } from '../caesar-lock.js';
import { detectActiveTools } from '../shared/tool-detector.js';

export interface DoctorResult {
  activeTools: ToolTarget[];
  lockedPlugins: number;
  missingPaths: string[];
  ok: boolean;
}

export function runDoctor(options: { cwd?: string } = {}): DoctorResult {
  const cwd = options.cwd ?? process.cwd();
  const activeTools = detectActiveTools(cwd);
  const lock = readLock(cwd);
  const plugins = Object.values(lock.plugins);
  const missingPaths: string[] = [];

  for (const entry of plugins) {
    for (const relPath of entry.installedPaths) {
      if (!existsSync(resolve(cwd, relPath))) {
        missingPaths.push(relPath);
      }
    }
  }

  return {
    activeTools,
    lockedPlugins: plugins.length,
    missingPaths,
    ok: missingPaths.length === 0,
  };
}
