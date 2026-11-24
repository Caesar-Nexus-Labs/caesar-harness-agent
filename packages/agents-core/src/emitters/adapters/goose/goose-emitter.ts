import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { getToolTargetMeta } from '../../../mapping/tool-targets.js';
import type { EmitContext, EmittedFile } from '../../core/emitter-interface.js';
import {
  type FrontmatterValue,
  serializeMarkdownAgent,
} from '../../serializers/markdown-frontmatter-serializer.js';
import { useWhenLine } from '../fallback/agents-md-text.js';

// Goose agent emitter: CanonicalAgent → `.goose/agents/{slug}.md`.
// Pure (no I/O). Deterministic frontmatter key order.

const GOOSE_KEY_ORDER = ['name', 'description', 'model', 'mcpServers'] as const;

export function gooseEmitter(agent: CanonicalAgent, _ctx: EmitContext): EmittedFile {
  const fm = agent.frontmatter;
  const data: Record<string, FrontmatterValue | undefined> = {
    name: agent.slug,
    description: useWhenLine(agent),
    model: fm.model,
    mcpServers: fm.mcp_servers && fm.mcp_servers.length > 0 ? fm.mcp_servers : undefined,
  };

  const content = serializeMarkdownAgent(data, GOOSE_KEY_ORDER, agent.body);
  const { outputSubdir } = getToolTargetMeta('goose');

  return {
    tool: 'goose',
    relativePath: `${outputSubdir}/${agent.slug}.md`,
    content,
  };
}
