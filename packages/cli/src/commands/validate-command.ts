import {
  type CanonicalAgent,
  discoverAgents,
  parseAgentFile,
  registerExtendedNativeEmitters,
  registerFallbackEmitters,
  registerNativeEmitters,
  TOOL_TARGETS,
  transpile,
  transpileAggregate,
} from '@caesar/agents-core';
import { splitToolsByTier } from '../agent-selection.js';
import type {
  OutputFailure,
  ValidateResult,
  ValidationFailure,
  ValidationWarning,
} from '../command-results.js';
import { extractIssues } from '../extract-issues.js';
import { resolvePaths } from '../resolve-paths.js';

// validate: parse + schema/body-validate every canonical source. With --strict, ALSO transpile
// each agent (native) + the full set (aggregate) in-memory and run output validators — NO write.
// THIN: parseAgentFile and the transpile validators carry all the rules; this only collects.

export interface ValidateOptions {
  strict?: boolean;
  root?: string;
  cwd?: string;
}

export function runValidate(options: ValidateOptions = {}): ValidateResult {
  const cwd = options.cwd ?? process.cwd();
  const { root } = resolvePaths(cwd, options.root);
  const isStrict = options.strict === true;

  const descriptors = discoverAgents(root);
  const failures: ValidationFailure[] = [];
  const warnings: ValidationWarning[] = [];
  const agents: CanonicalAgent[] = [];

  for (const d of descriptors) {
    try {
      const agent = parseAgentFile(d.path);
      agents.push(agent);
      if (agent.bodyWarnings.length > 0) {
        warnings.push({ path: d.path, warnings: agent.bodyWarnings });
      }
    } catch (err) {
      failures.push({ path: d.path, issues: extractIssues(err) });
    }
  }

  const outputFailures: OutputFailure[] = isStrict ? validateOutputs(agents) : [];

  // Soft-cap warnings are advisory only — they never affect `ok` or the exit code.
  const ok = failures.length === 0 && outputFailures.length === 0;
  return { checked: descriptors.length, failures, outputFailures, warnings, strict: isStrict, ok };
}

/**
 * Transpile every agent in-memory (no write) and surface any output-validator rejections.
 * Uses throwOnInvalidOutput=false so all failures are collected (not just the first).
 */
function validateOutputs(agents: readonly CanonicalAgent[]): OutputFailure[] {
  // Register all emitters BEFORE splitting — the tier split routes by registry membership
  // (hasAggregateEmitter), so kilo lands in the aggregate path and gemini/openhands in native.
  registerNativeEmitters();
  registerExtendedNativeEmitters();
  registerFallbackEmitters();

  const { native, fallback } = splitToolsByTier([...TOOL_TARGETS]);
  const ctx = { distRoot: 'dist' };
  const out: OutputFailure[] = [];

  for (const agent of agents) {
    const result = transpile(agent, native, ctx, { throwOnInvalidOutput: false });
    for (const ve of result.validationErrors) {
      out.push({ agent: agent.slug, tool: ve.tool, issues: ve.errors });
    }
  }

  if (agents.length > 0) {
    const result = transpileAggregate(agents, fallback, ctx, { throwOnInvalidOutput: false });
    for (const ve of result.validationErrors) {
      out.push({ agent: `<aggregate>`, tool: ve.tool, issues: ve.errors });
    }
  }

  return out;
}
