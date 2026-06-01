import type { ToolTarget } from '../mapping/tool-targets.js';

// Per-tool output validator contract + registry. A validator parses the EMITTED
// content (YAML/TOML/JSON) back into structure and zod-checks its shape before write
// (catches malformed output — G5). Validators are OPTIONAL: a tool with no registered
// validator simply skips validation. Concrete validators land with each emitter.

export interface ValidationResult {
  ok: boolean;
  /** Human-readable problems; empty when ok. */
  errors: string[];
}

/** Validate one tool's emitted file content. Pure: parses + checks, no I/O. */
export type OutputValidator = (content: string) => ValidationResult;

const registry = new Map<ToolTarget, OutputValidator>();

/** Register (or replace) the output validator for a tool target. */
export function registerOutputValidator(tool: ToolTarget, validator: OutputValidator): void {
  registry.set(tool, validator);
}

/** Get the registered output validator for a tool, or `undefined`. */
export function getOutputValidator(tool: ToolTarget): OutputValidator | undefined {
  return registry.get(tool);
}

/** True if a validator is registered for the tool. */
export function hasOutputValidator(tool: ToolTarget): boolean {
  return registry.has(tool);
}

/** Remove a single validator registration (primarily for test isolation). */
export function unregisterOutputValidator(tool: ToolTarget): void {
  registry.delete(tool);
}

/** Clear all registered validators (primarily for test isolation). */
export function clearOutputValidators(): void {
  registry.clear();
}

/** Convenience constructor for an ok result. */
export function validationOk(): ValidationResult {
  return { ok: true, errors: [] };
}

/** Convenience constructor for a failed result. */
export function validationFailed(errors: string[]): ValidationResult {
  return { ok: false, errors };
}
