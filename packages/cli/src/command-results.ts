// Shared, serializable result shapes returned by command functions. Commands return data
// (testable directly under vitest); index.ts/reporter decide how to render + which exit code.
// Keeping these plain objects (no class instances) makes `--json` output trivial and stable.

import type { ToolTarget } from '@caesar/agents-core';

/** One source file that failed to parse/validate. */
export interface ValidationFailure {
  path: string;
  issues: string[];
}

/** One output-validation failure during a --strict transpile (in-memory, no write). */
export interface OutputFailure {
  agent: string;
  tool: ToolTarget;
  issues: string[];
}

export interface BuildResult {
  outRoot: string;
  tools: ToolTarget[];
  /** Count of canonical agents that were transpiled. */
  agentCount: number;
  /** Absolute file paths written, grouped per tool. */
  writtenByTool: Record<string, string[]>;
  /** Tools requested but with no registered emitter (skipped gracefully). */
  skipped: ToolTarget[];
  /** Source files that failed to parse (build aborts before write if any). */
  parseFailures: ValidationFailure[];
  /** Total files written across all tools. */
  fileCount: number;
}

/** One source file that produced non-fatal advisories (e.g. >300-line soft cap). */
export interface ValidationWarning {
  path: string;
  warnings: string[];
}

export interface ValidateResult {
  /** Number of source files discovered + checked. */
  checked: number;
  /** Schema/body validation failures. */
  failures: ValidationFailure[];
  /** Output-validation failures (only populated with --strict). */
  outputFailures: OutputFailure[];
  /** Non-fatal advisories (e.g. body soft-cap). Never affect `ok`/exit code. */
  warnings: ValidationWarning[];
  strict: boolean;
  /** Convenience: true when no failures of any kind. */
  ok: boolean;
}

export interface InstallResult {
  tool: ToolTarget;
  category: string;
  dest: string;
  /** Files copied into dest (absolute paths). */
  copied: string[];
  /** Files skipped because they already existed and --force was not set. */
  skipped: string[];
  force: boolean;
}

export interface AddResult {
  source: string;
  name: string;
  version: string;
  scope: 'project' | 'global';
  dryRun: boolean;
  installedTools: ToolTarget[];
  copiedPaths: string[];
  skippedPaths: string[];
  lockUpdated: boolean;
}

export interface RemoveResult {
  name: string;
  scope: 'project' | 'global';
  dryRun: boolean;
  removedPaths: string[];
  skippedPaths: string[];
}

export interface ListResult {
  entries: Array<{
    name: string;
    version: string;
    source: 'npm' | 'github' | 'local';
    scope: 'project' | 'global';
    installedTools: ToolTarget[];
    installedAt: string;
  }>;
  projectLockPath?: string;
  globalLockPath?: string;
}
