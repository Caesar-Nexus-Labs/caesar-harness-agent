import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { mapModel } from '../../../mapping/model-alias-map.js';
import { mapPermission } from '../../../mapping/permission-map.js';
import { getToolTargetMeta } from '../../../mapping/tool-targets.js';
import type { EmitContext, EmittedFile } from '../../core/emitter-interface.js';
import {
  type FrontmatterValue,
  serializeMarkdownAgent,
} from '../../serializers/markdown-frontmatter-serializer.js';

// factory emitter: CanonicalAgent → `.factory/droids/{name}.md`.
// YAML-frontmatter markdown (deterministic key order). Body = the 6-section prompt. Pure.
//
// Fields (docs.factory.ai/cli/configuration/custom-droids, verified 2026-05-30):
//   name           → fm.name
//   description    → fm.description (trimmed; ≤500 chars per docs, not enforced here)
//   model          → mapModel(...,'factory') bare id (claude-sonnet-4-...); omitted on inherit
//   reasoningEffort→ fm.reasoning_effort (low/medium/high; ignored by Factory when model=inherit)
//   tools          → mapPermission(...).tools CATEGORY string (read-only/edit); OMITTED for the
//                    full tier (Factory has no `all` category — omit grants all tools)
//
// Factory has no per-agent `color` field (verified — not in the droid frontmatter schema), so
// the canonical `color` is intentionally dropped here.

/** Fixed frontmatter key order → stable snapshots regardless of object assembly. */
const FACTORY_KEY_ORDER = ['name', 'description', 'model', 'reasoningEffort', 'tools'] as const;

export function factoryEmitter(agent: CanonicalAgent, ctx: EmitContext): EmittedFile {
  const fm = agent.frontmatter;

  const model = mapModel(fm.model, 'factory', {
    modelProvider: ctx.modelProvider,
    overrides: ctx.modelOverrides,
  });
  // tools is undefined for the full tier → omitted by the serializer (grants all tools).
  const { tools } = mapPermission(fm.permission, 'factory');

  const data: Record<string, FrontmatterValue | undefined> = {
    name: fm.name,
    description: fm.description.trim(),
    // Factory always carries `model`; inherit (mapModel → undefined) → the literal `inherit`
    // (matches the documented droid example: `model: inherit`).
    model: model ?? 'inherit',
    reasoningEffort: fm.reasoning_effort,
    tools,
  };

  const content = serializeMarkdownAgent(data, FACTORY_KEY_ORDER, agent.body);
  const { outputSubdir } = getToolTargetMeta('factory');

  return {
    tool: 'factory',
    relativePath: `${outputSubdir}/${agent.slug}.md`,
    content,
  };
}
