// Tool target registry — the set of emit destinations + their output metadata.
// Single source of truth consumed by mapping tables, emitters, and write-outputs.

/** All transpiler emit targets. */
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
  'roo',
  'cursor',
  'claude-plugin',
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
  // Kilo: native-tier AGGREGATE target → one `.kilocodemodes` at repo root.
  kilo: { tier: 'native', fileExtension: '.kilocodemodes', outputSubdir: '' },
  // Roo Code: AGGREGATE target → one `.roomodes` at repo root (YAML, same structure as kilo).
  roo: { tier: 'native', fileExtension: '.roomodes', outputSubdir: '' },
  // Cursor: per-agent `.cursor/rules/{slug}.mdc` (Agent-Requested MDC rule).
  cursor: { tier: 'native', fileExtension: '.mdc', outputSubdir: '.cursor/rules' },
  // Claude Plugin Marketplace: AGGREGATE → `.claude-plugin/marketplace.json` + `plugin.json`.
  'claude-plugin': { tier: 'native', fileExtension: '.json', outputSubdir: '.claude-plugin' },
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
