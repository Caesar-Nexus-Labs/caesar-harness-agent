import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { mapModel } from '../../../mapping/model-alias-map.js';
import { mapPermission } from '../../../mapping/permission-map.js';
import { getToolTargetMeta } from '../../../mapping/tool-targets.js';
import { mapTools } from '../../../mapping/tools-map.js';
import { foldClaudeDescription } from './claude-description-folder.js';
import type { EmitContext, EmittedFile } from '../../core/emitter-interface.js';
import {
  type FrontmatterValue,
  serializeMarkdownAgent,
} from '../../serializers/markdown-frontmatter-serializer.js';

// claude emitter: CanonicalAgent → `.claude/agents/{name}.md`.
// Frontmatter (deterministic order): name, description, tools, model, permissionMode, color.
// Body = the 6-section prompt verbatim. Pure (no I/O).
//
// Field mapping (Phase 03 engine):
//   tools          → mapTools(...).join(', ')  (CSV; omitted when unrestricted)
//   model          → mapModel(...)             (always present: literal `inherit`|haiku|sonnet|opus)
//   permissionMode → mapPermission(...).permissionMode  (plan|acceptEdits|default)
//   color          → frontmatter.color         (omitted if absent)

/** Fixed frontmatter key order → stable snapshots regardless of object assembly. */
const CLAUDE_KEY_ORDER = [
  'name',
  'description',
  'tools',
  'model',
  'permissionMode',
  'color',
] as const;

export function claudeEmitter(agent: CanonicalAgent, ctx: EmitContext): EmittedFile {
  const fm = agent.frontmatter;

  const tools = mapTools(fm.tools, 'claude', fm.permission);
  const model = mapModel(fm.model, 'claude', {
    modelProvider: ctx.modelProvider,
    overrides: ctx.modelOverrides,
  });
  const { permissionMode } = mapPermission(fm.permission, 'claude');

  const data: Record<string, FrontmatterValue | undefined> = {
    name: fm.name,
    description: foldClaudeDescription(fm),
    tools: tools !== undefined ? tools.join(', ') : undefined,
    model,
    permissionMode,
    color: fm.color,
  };

  const content = serializeMarkdownAgent(data, CLAUDE_KEY_ORDER, agent.body);
  const { outputSubdir } = getToolTargetMeta('claude');

  return {
    tool: 'claude',
    relativePath: `${outputSubdir}/${agent.slug}.md`,
    content,
  };
}
