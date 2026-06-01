import {
  type EmitContext,
  type EmittedFile,
  getAggregateEmitter,
  getEmitter,
} from './emitters/emitter-interface.js';
import type { CanonicalAgent } from './loader/agent-file-loader.js';
import type { ToolTarget } from './mapping/tool-targets.js';
import { getOutputValidator } from './validation/output-validator-interface.js';

// Transpile engine: orchestrates emit + (optional) output validation per requested tool.
// Pure (no filesystem I/O) — writing emitted files is a separate step (write-outputs.ts).
// Open/closed: it knows nothing about concrete formats; it only consults the registries.

export interface TranspileOptions {
  /**
   * When true (default), if a registered output validator rejects emitted content,
   * throw a TranspileValidationError. When false, validation issues are returned
   * on the result instead of throwing.
   */
  throwOnInvalidOutput?: boolean;
}

export interface TranspileResult {
  files: EmittedFile[];
  /** Tools requested but having no registered emitter (skipped gracefully). */
  skipped: ToolTarget[];
  /** Validation problems collected when throwOnInvalidOutput is false. */
  validationErrors: { tool: ToolTarget; errors: string[] }[];
}

/** Thrown when a registered output validator rejects an emitted file (default behavior). */
export class TranspileValidationError extends Error {
  readonly tool: ToolTarget;
  readonly agent: string;
  readonly issues: string[];

  constructor(tool: ToolTarget, agent: string, issues: string[]) {
    super(`Output validation failed for "${agent}" → ${tool}:\n  - ${issues.join('\n  - ')}`);
    this.name = 'TranspileValidationError';
    this.tool = tool;
    this.agent = agent;
    this.issues = issues;
  }
}

/**
 * Transpile one canonical agent into emitted files for the requested tools.
 * - Tools without a registered emitter are skipped (not errors) → `result.skipped`.
 * - Tools with a registered output validator are validated post-emit.
 */
export function transpile(
  agent: CanonicalAgent,
  tools: readonly ToolTarget[],
  ctx: EmitContext,
  opts: TranspileOptions = {},
): TranspileResult {
  const throwOnInvalid = opts.throwOnInvalidOutput ?? true;
  const files: EmittedFile[] = [];
  const skipped: ToolTarget[] = [];
  const validationErrors: { tool: ToolTarget; errors: string[] }[] = [];

  for (const tool of tools) {
    const emitter = getEmitter(tool);
    if (emitter === undefined) {
      skipped.push(tool);
      continue;
    }

    const file = emitter(agent, ctx);

    const validator = getOutputValidator(tool);
    if (validator !== undefined) {
      const result = validator(file.content);
      if (!result.ok) {
        if (throwOnInvalid) {
          throw new TranspileValidationError(tool, agent.slug, result.errors);
        }
        validationErrors.push({ tool, errors: result.errors });
        continue; // do not emit a file that failed validation
      }
    }

    files.push(file);
  }

  return { files, skipped, validationErrors };
}

/**
 * Transpile the FULL agent set into aggregate fallback files (e.g. one `AGENTS.md`).
 * Aggregate emitters take all agents and produce a single routing index per tool.
 * - Tools without a registered aggregate emitter are skipped → `result.skipped`.
 * - A registered output validator (keyed by tool) validates the aggregate content post-emit.
 *
 * Kept SEPARATE from per-agent `transpile()` (open/closed): the per-agent path and its
 * registry are untouched. Callers that want both run `transpile()` per agent for native
 * targets and `transpileAggregate()` once for fallback targets.
 */
export function transpileAggregate(
  agents: readonly CanonicalAgent[],
  tools: readonly ToolTarget[],
  ctx: EmitContext,
  opts: TranspileOptions = {},
): TranspileResult {
  const throwOnInvalid = opts.throwOnInvalidOutput ?? true;
  const files: EmittedFile[] = [];
  const skipped: ToolTarget[] = [];
  const validationErrors: { tool: ToolTarget; errors: string[] }[] = [];

  for (const tool of tools) {
    const emitter = getAggregateEmitter(tool);
    if (emitter === undefined) {
      skipped.push(tool);
      continue;
    }

    const file = emitter(agents, ctx);

    const validator = getOutputValidator(tool);
    if (validator !== undefined) {
      const result = validator(file.content);
      if (!result.ok) {
        if (throwOnInvalid) {
          // Aggregate output is not tied to one agent — use the tool name as the subject.
          throw new TranspileValidationError(tool, `<aggregate:${tool}>`, result.errors);
        }
        validationErrors.push({ tool, errors: result.errors });
        continue; // do not emit a file that failed validation
      }
    }

    files.push(file);
  }

  return { files, skipped, validationErrors };
}
