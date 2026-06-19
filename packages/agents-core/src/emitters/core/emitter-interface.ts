import type { CanonicalAgent } from '../../loader/agent-file-loader.js';
import type { ModelOverrides } from '../../mapping/model-alias-map.js';
import type { ToolTarget } from '../../mapping/tool-targets.js';

// Emitter contract + registry. Emitters are PURE: CanonicalAgent → EmittedFile,
// no I/O (writing is a separate step in write-outputs.ts → testable via snapshots).
// Open/closed: adding a tool = register one emitter; the engine never changes.

export interface EmitContext {
  /** Root dir for build output (e.g. absolute path to `dist`). */
  distRoot: string;
  /** Override provider prefix for `provider/model-id` tools (opencode, kiro). */
  modelProvider?: string;
  /**
   * Per-install concrete model-id overrides (tier → tool → id), merged over defaults.
   * W3: lets the Phase 08 CLI pin specific models WITHOUT changing emitters — emitters
   * thread this straight into `mapModel`. Optional; omitting keeps default model ids.
   */
  modelOverrides?: ModelOverrides;
}

export interface EmittedFile {
  tool: ToolTarget;
  /** Path relative to the tool's dist root (e.g. `.claude/agents/code-reviewer.md`). */
  relativePath: string;
  content: string;
}

/** Pure transform from a canonical agent to one emitted file for a target tool. */
export type Emitter = (agent: CanonicalAgent, ctx: EmitContext) => EmittedFile;

/**
 * Pure transform from the FULL agent set to one emitted file for a target tool.
 * Used by aggregate fallback targets (e.g. `agents-md`) that produce a single
 * routing index covering all agents, NOT one file per agent.
 */
export type AggregateEmitter = (
  agents: readonly CanonicalAgent[],
  ctx: EmitContext,
) => EmittedFile | EmittedFile[];

const registry = new Map<ToolTarget, Emitter>();

/** Register (or replace) the emitter for a tool target. */
export function registerEmitter(tool: ToolTarget, emitter: Emitter): void {
  registry.set(tool, emitter);
}

/** Get the registered emitter for a tool, or `undefined` if none registered. */
export function getEmitter(tool: ToolTarget): Emitter | undefined {
  return registry.get(tool);
}

/** True if an emitter is registered for the tool. */
export function hasEmitter(tool: ToolTarget): boolean {
  return registry.has(tool);
}

/** All tool targets that currently have a registered emitter. */
export function registeredEmitters(): ToolTarget[] {
  return [...registry.keys()];
}

/** Remove a single emitter registration (primarily for test isolation). */
export function unregisterEmitter(tool: ToolTarget): void {
  registry.delete(tool);
}

/** Clear all registered emitters (primarily for test isolation). */
export function clearEmitters(): void {
  registry.clear();
}

// Aggregate emitters live in a SEPARATE registry so the per-agent path above stays
// untouched (open/closed). A target may register at most one of each kind; the engine
// dispatches to the right registry depending on whether it runs per-agent or aggregate.
const aggregateRegistry = new Map<ToolTarget, AggregateEmitter>();

/** Register (or replace) the aggregate emitter for a tool target. */
export function registerAggregateEmitter(tool: ToolTarget, emitter: AggregateEmitter): void {
  aggregateRegistry.set(tool, emitter);
}

/** Get the registered aggregate emitter for a tool, or `undefined` if none registered. */
export function getAggregateEmitter(tool: ToolTarget): AggregateEmitter | undefined {
  return aggregateRegistry.get(tool);
}

/** True if an aggregate emitter is registered for the tool. */
export function hasAggregateEmitter(tool: ToolTarget): boolean {
  return aggregateRegistry.has(tool);
}

/** All tool targets that currently have a registered aggregate emitter. */
export function registeredAggregateEmitters(): ToolTarget[] {
  return [...aggregateRegistry.keys()];
}

/** Remove a single aggregate emitter registration (primarily for test isolation). */
export function unregisterAggregateEmitter(tool: ToolTarget): void {
  aggregateRegistry.delete(tool);
}

/** Clear all registered aggregate emitters (primarily for test isolation). */
export function clearAggregateEmitters(): void {
  aggregateRegistry.clear();
}
