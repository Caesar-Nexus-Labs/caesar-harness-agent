import type {
  AddResult,
  AliasResult,
  BuildResult,
  InstallResult,
  RemoveResult,
  ValidateResult,
} from '../command-results.js';

// Rendering layer: turns command result objects into strings. Human summaries by default;
// `--json` emits the raw result object. No process.exit / no I/O beyond returning text —
// the caller (index.ts) writes to stdout/stderr and sets exit codes (separation of concerns).

/** Serialize any result object as pretty JSON for `--json`. */
export function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function formatBuild(result: BuildResult): string {
  const lines: string[] = [];
  lines.push(
    `Built ${result.fileCount} file(s) from ${result.agentCount} agent(s) → ${result.outRoot}`,
  );
  for (const tool of result.tools) {
    const written = result.writtenByTool[tool] ?? [];
    lines.push(`  ${tool}: ${written.length} file(s)`);
  }
  if (result.skipped.length > 0) {
    lines.push(`  skipped (no emitter): ${result.skipped.join(', ')}`);
  }
  if (result.parseFailures.length > 0) {
    lines.push(`  ${result.parseFailures.length} source(s) failed to parse:`);
    for (const f of result.parseFailures) {
      lines.push(`    ✗ ${f.path}`);
      for (const issue of f.issues) lines.push(`        - ${issue}`);
    }
  }
  return lines.join('\n');
}

export function formatValidate(result: ValidateResult): string {
  const lines: string[] = [];
  const totalFailures = result.failures.length + result.outputFailures.length;
  if (totalFailures === 0) {
    lines.push(`✓ ${result.checked} agent(s) valid${result.strict ? ' (strict)' : ''}.`);
    appendWarnings(lines, result);
    return lines.join('\n');
  }
  lines.push(
    `✗ ${totalFailures} failure(s) across ${result.checked} agent(s)${result.strict ? ' (strict)' : ''}:`,
  );
  for (const f of result.failures) {
    lines.push(`  ✗ ${f.path}`);
    for (const issue of f.issues) lines.push(`      - ${issue}`);
  }
  for (const f of result.outputFailures) {
    lines.push(`  ✗ ${f.agent} → ${f.tool}`);
    for (const issue of f.issues) lines.push(`      - ${issue}`);
  }
  appendWarnings(lines, result);
  return lines.join('\n');
}

/** Append non-fatal advisories (e.g. body soft-cap) below the result. Never affects exit code. */
function appendWarnings(lines: string[], result: ValidateResult): void {
  if (result.warnings.length === 0) return;
  lines.push(`  ${result.warnings.length} warning(s):`);
  for (const w of result.warnings) {
    lines.push(`  ⚠ ${w.path}`);
    for (const msg of w.warnings) lines.push(`      - ${msg}`);
  }
}

export function formatInstall(result: InstallResult): string {
  const lines: string[] = [];
  lines.push(
    `Installed ${result.copied.length} file(s) for ${result.category} → ${result.tool} into ${result.dest}`,
  );
  if (result.skipped.length > 0) {
    lines.push(`  ${result.skipped.length} existing file(s) skipped (use --force to overwrite):`);
    for (const s of result.skipped) lines.push(`    - ${s}`);
  }
  return lines.join('\n');
}

export function formatAdd(result: AddResult): string {
  const lines: string[] = [];
  lines.push(`Added plugin ${result.name}@${result.version} from ${result.source}`);
  lines.push(`Scope: ${result.scope}`);
  if (result.dryRun) {
    lines.push(`[DRY RUN] No files were written.`);
  }

  lines.push(
    `Installed ${result.copiedPaths.length} file(s) across ${result.installedTools.length} tool(s):`,
  );
  if (result.installedTools.length > 0) {
    lines.push(`  Tools: ${result.installedTools.join(', ')}`);
  }

  if (result.skippedPaths.length > 0) {
    lines.push(
      `  ${result.skippedPaths.length} existing file(s) skipped (use --force to overwrite)`,
    );
  }

  if (result.lockUpdated) {
    lines.push(`  Lockfile updated.`);
  }

  return lines.join('\n');
}

export function formatRemove(result: RemoveResult): string {
  const lines: string[] = [];
  lines.push(`Removed plugin ${result.name}`);
  lines.push(`Scope: ${result.scope}`);
  if (result.dryRun) {
    lines.push(`[DRY RUN] No files were removed.`);
  }

  lines.push(`Removed ${result.removedPaths.length} file(s).`);

  if (result.skippedPaths.length > 0) {
    lines.push(`  ${result.skippedPaths.length} file(s) were already absent.`);
  }

  return lines.join('\n');
}

import type { ListResult } from '../command-results.js';

export function formatList(result: ListResult): string {
  if (result.entries.length === 0) {
    return 'No plugins installed.';
  }

  const pad = (str: string, len: number) => {
    if (str.length > len) return `${str.slice(0, len - 3)}...`;
    return str.padEnd(len, ' ');
  };

  const lines: string[] = [];
  lines.push(
    `┌${'─'.repeat(21)}┬${'─'.repeat(10)}┬${'─'.repeat(9)}┬${'─'.repeat(30)}┬${'─'.repeat(12)}┐`,
  );
  lines.push(
    `│ ${pad('Name', 19)} │ ${pad('Version', 8)} │ ${pad('Scope', 7)} │ ${pad('Tools', 28)} │ ${pad('Installed', 10)} │`,
  );
  lines.push(
    `├${'─'.repeat(21)}┼${'─'.repeat(10)}┼${'─'.repeat(9)}┼${'─'.repeat(30)}┼${'─'.repeat(12)}┤`,
  );

  for (const e of result.entries) {
    const toolsStr = e.installedTools.join(', ');
    const dateStr = new Date(e.installedAt).toISOString().split('T')[0];
    lines.push(
      `│ ${pad(e.name, 19)} │ ${pad(e.version, 8)} │ ${pad(e.scope, 7)} │ ${pad(toolsStr, 28)} │ ${pad(dateStr as string, 10)} │`,
    );
  }

  lines.push(
    `└${'─'.repeat(21)}┴${'─'.repeat(10)}┴${'─'.repeat(9)}┴${'─'.repeat(30)}┴${'─'.repeat(12)}┘`,
  );

  return lines.join('\n');
}

export function formatAlias(result: AliasResult): string {
  const lines: string[] = [];
  lines.push(result.message);
  if (result.dryRun) {
    lines.push('--- GENERATED WRAPPERS ---');
    lines.push(result.content);
    lines.push('--------------------------');
  }
  return lines.join('\n');
}
