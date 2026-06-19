import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { mapModel } from '../../../mapping/model-alias-map.js';
import { mapPermission } from '../../../mapping/permission-map.js';
import { getToolTargetMeta } from '../../../mapping/tool-targets.js';
import type { EmitContext, EmittedFile } from '../../core/emitter-interface.js';
import {
  type FrontmatterValue,
  serializeMarkdownAgent,
} from '../../serializers/markdown-frontmatter-serializer.js';

// opencode emitter: CanonicalAgent → `.opencode/agents/{name}.md`.
// Frontmatter (deterministic order): description, mode, model, temperature, permission.
// Uses the current `permission:` BLOCK (not the deprecated `tools:{}` object) per
// researcher-260530-0216-opencode-rules-tools-format §1. Body = prompt verbatim. Pure.
//
// Field mapping (Phase 03 engine):
//   description → frontmatter.description       (routing hint)
//   mode        → constant `subagent`           (task-invoked agents)
//   model       → mapModel(...)                 (`provider/model-id`; omitted on inherit)
//   temperature → omitted                       (no canonical field — never invented)
//   permission  → mapPermission(...).permission ({edit, bash}; read always allowed)

/** Fixed frontmatter key order → stable snapshots regardless of object assembly. */
const OPENCODE_KEY_ORDER = ['description', 'mode', 'model', 'temperature', 'permission'] as const;

export function opencodeEmitter(agent: CanonicalAgent, ctx: EmitContext): EmittedFile {
  const fm = agent.frontmatter;

  const model = mapModel(fm.model, 'opencode', {
    modelProvider: ctx.modelProvider,
    overrides: ctx.modelOverrides,
  });
  const { permission } = mapPermission(fm.permission, 'opencode');

  const data: Record<string, FrontmatterValue | undefined> = {
    description: fm.description.trim(),
    mode: 'subagent',
    model,
    temperature: undefined,
    permission: { edit: permission.edit, bash: permission.bash },
  };

  const content = serializeMarkdownAgent(data, OPENCODE_KEY_ORDER, agent.body);
  const { outputSubdir } = getToolTargetMeta('opencode');

  return {
    tool: 'opencode',
    relativePath: `${outputSubdir}/${agent.slug}.md`,
    content,
  };
}
