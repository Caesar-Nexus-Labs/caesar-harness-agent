import type { BuildResult, InstallResult, ValidateResult } from '../command-results.js';

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
