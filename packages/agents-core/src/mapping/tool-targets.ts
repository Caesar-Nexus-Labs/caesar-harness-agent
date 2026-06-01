// Tool target registry — the set of emit destinations + their output metadata.
// Single source of truth consumed by mapping tables, emitters, and write-outputs.

/** All transpiler emit targets. `roo` is intentionally excluded (sunset 2026-05-15). */
export const TOOL_TARGETS = [
  'claude',
  'opencode',
  'kiro',
  'codex',
  'factory',
  'copilot',
  'openhands',
  'gemini',
  'kilo',
  'agents-md',
] as const;

export type ToolTarget = (typeof TOOL_TARGETS)[number];

/** native = first-class subagent file; fallback = aggregated AGENTS.md routing index. */
export type ToolTier = 'native' | 'fallback';

export interface ToolTargetMeta {
  tier: ToolTier;
  /** Per-agent file extension (informational for per-agent emitters). */
  fileExtension: string;
  /** Directory (relative to the tool's dist root) where per-agent files land. */
  outputSubdir: string;
}

/**
 * Per-target output metadata. `agents-md` is an aggregated single-file fallback,
 * so its outputSubdir is the repo root ('') — the emitter sets the exact filename.
 */
export const TOOL_TARGET_META: Record<ToolTarget, ToolTargetMeta> = {
  claude: { tier: 'native', fileExtension: '.md', outputSubdir: '.claude/agents' },
  opencode: { tier: 'native', fileExtension: '.md', outputSubdir: '.opencode/agents' },
  kiro: { tier: 'native', fileExtension: '.json', outputSubdir: '.kiro/agents' },
  codex: { tier: 'native', fileExtension: '.toml', outputSubdir: '.codex/agents' },
  factory: { tier: 'native', fileExtension: '.md', outputSubdir: '.factory/droids' },
  copilot: { tier: 'native', fileExtension: '.agent.md', outputSubdir: '.github/agents' },
  // OpenHands: folder-per-skill — emitter builds `{slug}/SKILL.md` under this parent subdir.
  openhands: { tier: 'native', fileExtension: '.md', outputSubdir: '.agents/skills' },
  // Gemini CLI: per-agent flat file `{slug}.md` (copilot mold MINUS tools/model — inherit-only).
  gemini: { tier: 'native', fileExtension: '.md', outputSubdir: '.gemini/agents' },
  // Kilo: first native-tier AGGREGATE target → one `.kilocodemodes` at repo root. Dispatch is by
  // registry (hasAggregateEmitter), not tier; ext `.kilocodemodes` (not `.yaml`) so install's
  // extension logic isn't lied to — aggregates bypass the extension filter anyway.
  kilo: { tier: 'native', fileExtension: '.kilocodemodes', outputSubdir: '' },
  'agents-md': { tier: 'fallback', fileExtension: '.md', outputSubdir: '' },
};

/** Lookup metadata for a target. */
export function getToolTargetMeta(target: ToolTarget): ToolTargetMeta {
  return TOOL_TARGET_META[target];
}

/** Runtime narrowing guard — useful when validating CLI input. */
export function isToolTarget(value: string): value is ToolTarget {
  return (TOOL_TARGETS as readonly string[]).includes(value);
}
