import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { mapModel } from '../../../mapping/model-alias-map.js';
import { getToolTargetMeta } from '../../../mapping/tool-targets.js';
import { mapTools } from '../../../mapping/tools-map.js';
import type { EmitContext, EmittedFile } from '../../core/emitter-interface.js';
import {
  type FrontmatterValue,
  serializeMarkdownAgent,
} from '../../serializers/markdown-frontmatter-serializer.js';

// copilot emitter: CanonicalAgent → `.github/agents/{name}.agent.md`.
// YAML-frontmatter markdown (deterministic key order). Body = the 6-section prompt. Pure.
//
// Fields (docs.github.com/en/copilot/reference/custom-agents-configuration, verified 2026-05-30):
//   name        → fm.name
//   description → fm.description (trimmed; REQUIRED per docs)
//   tools       → mapTools(...,'copilot') YAML ARRAY of aliases (read/search/edit/execute/web)
//   model       → mapModel(...,'copilot'); omitted on inherit
//
// OMITTED by design:
//   target   — defaults to BOTH (vscode + github-copilot) when absent; we never pin one env.
//   handoffs — VS Code-only inter-agent wiring, ignored on GitHub.com; no handoffs authored (v1).

/** Fixed frontmatter key order → stable snapshots regardless of object assembly. */
const COPILOT_KEY_ORDER = ['name', 'description', 'tools', 'model'] as const;

export function copilotEmitter(agent: CanonicalAgent, ctx: EmitContext): EmittedFile {
  const fm = agent.frontmatter;

  // mapTools returns a deduped alias list, or undefined when unrestricted (edit/full with no
  // explicit list) → omit the tools field so Copilot grants its default tool surface.
  const tools = mapTools(fm.tools, 'copilot', fm.permission);
  const model = mapModel(fm.model, 'copilot', {
    modelProvider: ctx.modelProvider,
    overrides: ctx.modelOverrides,
  });

  const data: Record<string, FrontmatterValue | undefined> = {
    name: fm.name,
    description: fm.description.trim(),
    // YAML array (serializer renders a block sequence); undefined → omitted.
    tools,
    model,
  };

  const content = serializeMarkdownAgent(data, COPILOT_KEY_ORDER, agent.body);
  const { outputSubdir } = getToolTargetMeta('copilot');

  return {
    tool: 'copilot',
    relativePath: `${outputSubdir}/${agent.slug}.agent.md`,
    content,
  };
}
