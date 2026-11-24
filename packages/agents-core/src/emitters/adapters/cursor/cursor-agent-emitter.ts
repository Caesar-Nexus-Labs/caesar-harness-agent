import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { getToolTargetMeta } from '../../../mapping/tool-targets.js';
import type { EmitContext, EmittedFile } from '../../core/emitter-interface.js';
import {
  type FrontmatterValue,
  serializeMarkdownAgent,
} from '../../serializers/markdown-frontmatter-serializer.js';
import { useWhenLine } from '../fallback/agents-md-text.js';

// Cursor native subagent emitter: CanonicalAgent → `.cursor/agents/{slug}.md`.
// Pure (no I/O). Deterministic frontmatter key order for stable snapshots.

const CURSOR_AGENT_KEY_ORDER = [
  'name',
  'description',
  'model',
  'readonly',
  'is_background',
] as const;

export function cursorAgentEmitter(agent: CanonicalAgent, _ctx: EmitContext): EmittedFile {
  const fm = agent.frontmatter;
  const data: Record<string, FrontmatterValue | undefined> = {
    name: agent.slug,
    description: useWhenLine(agent),
    model: fm.model === 'fast' ? 'fast' : 'inherit',
    readonly: fm.permission === 'read-only',
    is_background: fm.isolation === 'background',
  };

  const content = serializeMarkdownAgent(data, CURSOR_AGENT_KEY_ORDER, agent.body);
  const { outputSubdir } = getToolTargetMeta('cursor');

  return {
    tool: 'cursor',
    relativePath: `${outputSubdir}/${agent.slug}.md`,
    content,
  };
}
