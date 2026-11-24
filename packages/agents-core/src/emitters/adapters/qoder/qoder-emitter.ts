import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { getToolTargetMeta } from '../../../mapping/tool-targets.js';
import { mapTools } from '../../../mapping/tools-map.js';
import type { Permission } from '../../../schema/enums.js';
import type { EmitContext, EmittedFile } from '../../core/emitter-interface.js';
import {
  type FrontmatterValue,
  serializeMarkdownAgent,
} from '../../serializers/markdown-frontmatter-serializer.js';
import { useWhenLine } from '../fallback/agents-md-text.js';

// Qoder native subagent emitter: CanonicalAgent → `.qoder/agents/{slug}.md`.
// Pure (no I/O). Deterministic frontmatter key order.

const QODER_KEY_ORDER = [
  'name',
  'description',
  'model',
  'tools',
  'color',
  'effort',
  'permissionMode',
  'mcpServers',
] as const;

function mapQoderPermissionMode(permission: Permission): string {
  switch (permission) {
    case 'read-only':
      return 'plan';
    case 'edit':
      return 'acceptEdits';
    case 'full':
      return 'default';
  }
}

export function qoderEmitter(agent: CanonicalAgent, _ctx: EmitContext): EmittedFile {
  const fm = agent.frontmatter;
  const tools = mapTools(fm.tools, 'qoder', fm.permission);

  const data: Record<string, FrontmatterValue | undefined> = {
    name: agent.slug,
    description: useWhenLine(agent),
    model: fm.model,
    tools,
    color: fm.color,
    effort: fm.reasoning_effort,
    permissionMode: mapQoderPermissionMode(fm.permission),
    mcpServers: fm.mcp_servers && fm.mcp_servers.length > 0 ? fm.mcp_servers : undefined,
  };

  const content = serializeMarkdownAgent(data, QODER_KEY_ORDER, agent.body);
  const { outputSubdir } = getToolTargetMeta('qoder');

  return {
    tool: 'qoder',
    relativePath: `${outputSubdir}/${agent.slug}.md`,
    content,
  };
}
