import type { ModelTier } from '../schema/enums.js';
import type { ToolTarget } from './tool-targets.js';

// Model alias → concrete per-tool model id mapping.
//
// SOURCE + DATE: ids below reflect the 2026-05-30 tool matrix
// (docs/tech-stack.md §5).
// Only `anthropic/claude-sonnet-4-20250514` is doc-verified (OpenCode docs example);
// haiku/opus dated ids and Factory/Copilot ids are reasonable placeholders marked
// `TODO verify` — Phase 06 verifies Kiro/Factory/Copilot ids (Q5).
//
// `undefined` return = OMIT the model field (tool inherits its session/parent default).

/** Tools that express models as `provider/model-id` (default provider = anthropic). */
const PROVIDER_MODEL_TOOLS: ReadonlySet<ToolTarget> = new Set(['opencode']);

/** Bare Anthropic model ids per tier (provider prefix applied for provider/model-id tools). */
const ANTHROPIC_BARE_MODEL: Record<ModelTier, string | undefined> = {
  inherit: undefined,
  fast: 'claude-haiku-4-20250514', // TODO verify exact dated id (Phase 06)
  balanced: 'claude-sonnet-4-20250514', // verified: OpenCode docs example, 2026-05-30
  top: 'claude-opus-4-20250514', // TODO verify exact dated id (Phase 06)
};

/** Claude Code accepts short tier aliases directly (plus literal `inherit`). */
const CLAUDE_MODEL: Record<ModelTier, string> = {
  inherit: 'inherit',
  fast: 'haiku',
  balanced: 'sonnet',
  top: 'opus',
};

/** Codex model ids (developers.openai.com/codex/subagents). inherit → omit. */
const CODEX_MODEL: Record<ModelTier, string | undefined> = {
  inherit: undefined,
  fast: 'gpt-5.4-mini',
  balanced: 'gpt-5.4',
  top: 'gpt-5.5',
};

/** Factory/Droid model ids — Anthropic-family default. inherit → omit. */
const FACTORY_MODEL: Record<ModelTier, string | undefined> = {
  inherit: undefined,
  fast: 'claude-haiku-4-20250514', // TODO verify Factory model id format (Phase 06)
  balanced: 'claude-sonnet-4-20250514', // TODO verify Factory model id format (Phase 06)
  top: 'claude-opus-4-20250514', // TODO verify Factory model id format (Phase 06)
};

/** GitHub Copilot model names (ignored on GitHub.com cloud agent). inherit → omit. */
const COPILOT_MODEL: Record<ModelTier, string | undefined> = {
  inherit: undefined,
  fast: 'gpt-5.4-mini', // TODO verify Copilot model naming (Phase 06)
  balanced: 'gpt-5.4', // TODO verify Copilot model naming (Phase 06)
  top: 'gpt-5.5', // TODO verify Copilot model naming (Phase 06)
};

/**
 * Kiro model ids — bare model id matched against Kiro's model service (verified 2026-05-30,
 * kiro.dev/docs/cli/custom-agents/configuration-reference: `model` is a plain id like
 * `claude-sonnet-4`, NOT provider/model-id; an unknown id falls back to default + warns).
 * inherit → omit (Kiro then uses the parent/session default).
 */
const KIRO_MODEL: Record<ModelTier, string | undefined> = {
  inherit: undefined,
  fast: 'claude-haiku-4', // TODO verify exact Kiro model id (Phase 06, Q5)
  balanced: 'claude-sonnet-4', // TODO verify exact Kiro model id (Phase 06, Q5)
  top: 'claude-opus-4', // TODO verify exact Kiro model id (Phase 06, Q5)
};

/**
 * Per-install override of concrete model ids: a partial nested map merged over defaults.
 * Keyed by tier → tool → concrete id. Lets a user pin a specific model per tool
 * WITHOUT changing emitters (threaded through EmitContext for the CLI in Phase 08).
 */
export type ModelOverrides = Partial<Record<ModelTier, Partial<Record<ToolTarget, string>>>>;

export interface ModelMapOptions {
  /** Override provider prefix for `provider/model-id` tools (opencode, kiro). Default 'anthropic'. */
  modelProvider?: string;
  /** Per-install override of concrete ids merged over defaults (see ModelOverrides). */
  overrides?: ModelOverrides;
}

/**
 * Map a canonical model tier alias to a tool's concrete model id.
 * Returns `undefined` when the field should be omitted (inherit parent/session default).
 *
 * - claude: short alias literal (`inherit`/`haiku`/`sonnet`/`opus`)
 * - opencode: `provider/model-id` (provider configurable via opts.modelProvider)
 * - kiro/codex/factory/copilot: their own bare id sets
 * - agents-md: always undefined (aggregated fallback has no per-agent model field)
 */
export function mapModel(
  alias: ModelTier,
  tool: ToolTarget,
  opts: ModelMapOptions = {},
): string | undefined {
  const override = opts.overrides?.[alias]?.[tool];
  if (override !== undefined) return override;

  if (PROVIDER_MODEL_TOOLS.has(tool)) {
    const bare = ANTHROPIC_BARE_MODEL[alias];
    if (bare === undefined) return undefined;
    const provider = opts.modelProvider ?? 'anthropic';
    return `${provider}/${bare}`;
  }

  switch (tool) {
    case 'claude':
      return CLAUDE_MODEL[alias];
    case 'kiro':
      return KIRO_MODEL[alias];
    case 'codex':
      return CODEX_MODEL[alias];
    case 'factory':
      return FACTORY_MODEL[alias];
    case 'copilot':
      return COPILOT_MODEL[alias];
    default:
      // agents-md (and any future fallback target) carry no per-agent model field.
      return undefined;
  }
}
