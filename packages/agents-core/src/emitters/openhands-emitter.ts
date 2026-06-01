import type { CanonicalAgent } from '../loader/agent-file-loader.js';
import { getToolTargetMeta } from '../mapping/tool-targets.js';
import { useWhenLine } from './agents-md-text.js';
import type { EmitContext, EmittedFile } from './emitter-interface.js';
import {
  type FrontmatterValue,
  serializeMarkdownAgent,
} from './markdown-frontmatter-serializer.js';

// openhands emitter: CanonicalAgent → `.agents/skills/{slug}/SKILL.md` (folder-per-skill).
// YAML-frontmatter markdown (deterministic key order). Body = the 6-section prompt. Pure.
//
// INHERIT-ONLY (88% official, current `.agents/skills` format — NOT deprecated
// `.openhands/microagents`): emit name + description ONLY. NO `triggers` (canonical schema has
// no keywords/tags field → deriving from slug words = noise across all agents). NO
// tools/model/permission — the skill inherits the agent's tool surface + model. Skills ship
// agent-invoked (documented-valid). Same low-fidelity mold as Gemini; only the nested path
// ({slug}/SKILL.md vs flat) differs.

/** Fixed frontmatter key order → stable snapshots regardless of object assembly. */
const OPENHANDS_KEY_ORDER = ['name', 'description'] as const;

export function openhandsEmitter(agent: CanonicalAgent, _ctx: EmitContext): EmittedFile {
  const data: Record<string, FrontmatterValue | undefined> = {
    name: agent.slug,
    // one-line description: prefer when_to_use, fall back to description (shared helper).
    description: useWhenLine(agent),
  };

  const content = serializeMarkdownAgent(data, OPENHANDS_KEY_ORDER, agent.body);
  const { outputSubdir } = getToolTargetMeta('openhands');

  return {
    tool: 'openhands',
    relativePath: `${outputSubdir}/${agent.slug}/SKILL.md`,
    content,
  };
}
