// Tool target registry — the set of emit destinations + their output metadata.
// Single source of truth consumed by mapping tables, emitters, and write-outputs.

/** All transpiler emit targets. */
export const TOOL_TARGETS = [
  'claude',
  'opencode',
  'kiro',
  'codex',
  'codex-config',
  'factory',
  'copilot',
  'openhands',
  'agent-skills',
  'gemini',
  'gemini-extension',
  'kilo',
  'roo',
  'cursor',
  'cursor-mdc',
  'qoder',
  'qwen',
  'qwen-extension',
  'goose',
  'a2a-card',
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
  // Codex CLI aggregate config: `.codex/config.toml` (`[agents.<slug>]` + `prompt_file`).
  'codex-config': { tier: 'native', fileExtension: '.toml', outputSubdir: '.codex' },
  factory: { tier: 'native', fileExtension: '.md', outputSubdir: '.factory/droids' },
  copilot: { tier: 'native', fileExtension: '.agent.md', outputSubdir: '.github/agents' },
  // OpenHands: legacy alias for `.agents/skills/{slug}/SKILL.md`.
  openhands: { tier: 'native', fileExtension: '.md', outputSubdir: '.agents/skills' },
  // Universal Agent Skills (agentskills.io): `.agents/skills/{slug}/SKILL.md`.
  'agent-skills': { tier: 'native', fileExtension: '.md', outputSubdir: '.agents/skills' },
  // Gemini CLI: per-agent flat file `{slug}.md` (copilot mold MINUS tools/model — inherit-only).
  gemini: { tier: 'native', fileExtension: '.md', outputSubdir: '.gemini/agents' },
  // Gemini CLI Extension bundle: AGGREGATE → `gemini-extension.json`.
  'gemini-extension': { tier: 'native', fileExtension: '.json', outputSubdir: '' },
  // Kilo: native-tier AGGREGATE target → one `.kilocodemodes` at repo root.
  kilo: { tier: 'native', fileExtension: '.kilocodemodes', outputSubdir: '' },
  // Roo Code: AGGREGATE target → one `.roomodes` at repo root (YAML, same structure as kilo).
  roo: { tier: 'native', fileExtension: '.roomodes', outputSubdir: '' },
  // Cursor: native subagents `.cursor/agents/{slug}.md`.
  cursor: { tier: 'native', fileExtension: '.md', outputSubdir: '.cursor/agents' },
  // Cursor MDC (legacy opt-in): per-agent `.cursor/rules/{slug}.mdc`.
  'cursor-mdc': { tier: 'native', fileExtension: '.mdc', outputSubdir: '.cursor/rules' },
  // Qoder IDE/CLI: native subagents `.qoder/agents/{slug}.md`.
  qoder: { tier: 'native', fileExtension: '.md', outputSubdir: '.qoder/agents' },
  // Qwen Code CLI: per-skill `.qwen/skills/{slug}/SKILL.md`.
  qwen: { tier: 'native', fileExtension: '.md', outputSubdir: '.qwen/skills' },
  // Qwen Code Extension bundle: AGGREGATE → `qwen-extension.json`.
  'qwen-extension': { tier: 'native', fileExtension: '.json', outputSubdir: '' },
  // Goose: native per-agent `.goose/agents/{slug}.md`.
  goose: { tier: 'native', fileExtension: '.md', outputSubdir: '.goose/agents' },
  // A2A Agent Card: AGGREGATE → `.well-known/agent-card.json`.
  'a2a-card': { tier: 'native', fileExtension: '.json', outputSubdir: '.well-known' },
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
