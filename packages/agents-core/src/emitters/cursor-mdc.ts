import { stringify as stringifyYaml } from 'yaml';
import type { CanonicalAgent } from '../loader/agent-file-loader.js';
import type { EmitContext, EmittedFile } from './emitter-interface.js';

// Cursor MDC native transpiler emitter: CanonicalAgent → `.cursor/rules/{slug}.mdc`.
//
// This is the NATIVE transpiler target version of cursor MDC emission, wired into the
// typed `ToolTarget` registry (unlike the opt-in `cursorRuleEmitter` in opt-in-rules/).
// Key difference: this emitter is invoked per-agent by the transpile engine like all
// other native emitters, and its output lands in `dist/cursor/` for the install pipeline.
//
// Cursor reads `.mdc` files (markdown + YAML frontmatter) from `.cursor/rules/`.
// Agent-Requested rule: `alwaysApply: false` + `description` → model pulls by relevance.
// Frontmatter: description, alwaysApply, globs (omitted when none).
//
// CRITICAL: The source markdown frontmatter is already stripped by the loader — `agent.body`
// contains ONLY the prompt body (no `---` block). No de-duplication needed here.
// Pure (no I/O).

/** Serialize frontmatter object to `---`-delimited YAML block (deterministic key order). */
function frontmatterBlock(data: Record<string, unknown>): string {
  const yaml = stringifyYaml(data, { lineWidth: 0 }).trimEnd();
  return `---\n${yaml}\n---`;
}

/**
 * Sanitize and normalize the agent body for MDC embedding.
 * - Normalize CRLF → LF
 * - Trim edges
 * Source frontmatter is already excluded (gray-matter strips it in the loader).
 */
function sanitizeBody(body: string): string {
  return body.replace(/\r\n?/g, '\n').trim();
}

/**
 * Map agent trigger/when_to_use text to file glob patterns.
 * Heuristic: if when_to_use mentions specific file types, extract globs.
 * Returns empty array when no scoping signals are found (model uses description instead).
 */
function deriveGlobs(agent: CanonicalAgent): string[] {
  const hints = [agent.frontmatter.when_to_use ?? '', agent.frontmatter.description].join(' ');

  const globs: string[] = [];

  // Language-specific hints → file globs.
  if (/\brust\b/i.test(hints)) globs.push('**/*.rs');
  if (/\bpython\b/i.test(hints)) globs.push('**/*.py');
  if (/\btypescript\b/i.test(hints)) globs.push('**/*.ts', '**/*.tsx');
  if (/\bjavascript\b/i.test(hints)) globs.push('**/*.js', '**/*.jsx');
  if (/\bgo\b(?!\w)/i.test(hints)) globs.push('**/*.go');
  if (/\bsql\b/i.test(hints)) globs.push('**/*.sql');
  if (/\byaml\b|\byml\b/i.test(hints)) globs.push('**/*.yaml', '**/*.yml');
  if (/\bmarkdown\b|\b\.md\b/i.test(hints)) globs.push('**/*.md');
  if (/\bdocker\b/i.test(hints)) globs.push('Dockerfile', 'docker-compose*.yml');
  if (/\btest\b|\bspec\b/i.test(hints)) globs.push('**/*.test.*', '**/*.spec.*');

  // Deduplicate while preserving order.
  return [...new Set(globs)];
}

/**
 * Cursor MDC native emitter.
 * Per-agent: CanonicalAgent → `.cursor/rules/{slug}.mdc`
 */
export function cursorMdcEmitter(agent: CanonicalAgent, _ctx: EmitContext): EmittedFile {
  const fm = agent.frontmatter;

  const globs = deriveGlobs(agent);

  const frontmatterData: Record<string, unknown> = {
    description: fm.description.trim(),
    alwaysApply: false,
  };
  if (globs.length > 0) frontmatterData.globs = globs;

  const body = sanitizeBody(agent.body);
  const content = `${frontmatterBlock(frontmatterData)}\n\n${body}\n`;

  return {
    tool: 'cursor',
    relativePath: `.cursor/rules/${agent.slug}.mdc`,
    content,
  };
}
