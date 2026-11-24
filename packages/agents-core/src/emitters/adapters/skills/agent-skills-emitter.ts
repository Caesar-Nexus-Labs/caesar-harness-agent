import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { getToolTargetMeta } from '../../../mapping/tool-targets.js';
import type { EmitContext, EmittedFile } from '../../core/emitter-interface.js';
import {
  type FrontmatterValue,
  serializeMarkdownAgent,
} from '../../serializers/markdown-frontmatter-serializer.js';
import { useWhenLine } from '../fallback/agents-md-text.js';

// Universal Agent Skills emitter (agentskills.io): CanonicalAgent → `.agents/skills/{slug}/SKILL.md`.
// Progressive-disclosure format supported across Claude Code, Cursor, Codex, Copilot, Gemini CLI,
// Qoder, Qwen Code, and OpenHands. Pure (no I/O).

const AGENT_SKILL_KEY_ORDER = [
  'name',
  'description',
  'disable-model-invocation',
  'user-invocable',
] as const;

export function agentSkillsEmitter(agent: CanonicalAgent, _ctx: EmitContext): EmittedFile {
  const inv = agent.frontmatter.invocation;
  const data: Record<string, FrontmatterValue | undefined> = {
    name: agent.slug,
    description: useWhenLine(agent),
    'disable-model-invocation': inv?.disable_model_invocation,
    'user-invocable': inv?.user_invocable,
  };

  const content = serializeMarkdownAgent(data, AGENT_SKILL_KEY_ORDER, agent.body);
  const { outputSubdir } = getToolTargetMeta('agent-skills');

  return {
    tool: 'agent-skills',
    relativePath: `${outputSubdir}/${agent.slug}/SKILL.md`,
    content,
  };
}
