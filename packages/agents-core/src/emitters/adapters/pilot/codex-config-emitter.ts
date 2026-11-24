import { stringify as stringifyToml } from '@iarna/toml';
import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { mapModel } from '../../../mapping/model-alias-map.js';
import { mapPermission } from '../../../mapping/permission-map.js';
import type { AggregateEmitter, EmitContext, EmittedFile } from '../../core/emitter-interface.js';

// Codex CLI aggregate config emitter: ALL agents → `.codex/config.toml`.
// Emits `[agents.<slug>]` entries with `description`, `prompt_file`, `sandbox_mode`,
// and optional `model` / `model_reasoning_effort`. Pure (no I/O).

export const codexConfigEmitter: AggregateEmitter = (
  agents: readonly CanonicalAgent[],
  ctx: EmitContext,
): EmittedFile => {
  const sorted = [...agents].sort((a, b) => a.slug.localeCompare(b.slug));
  const agentEntries: Record<string, Record<string, string>> = {};

  for (const agent of sorted) {
    const fm = agent.frontmatter;
    const model = mapModel(fm.model, 'codex', {
      modelProvider: ctx.modelProvider,
      overrides: ctx.modelOverrides,
    });
    const { sandbox_mode } = mapPermission(fm.permission, 'codex');

    const entry: Record<string, string> = {
      description: fm.description.trim(),
      prompt_file: `.codex/agents/${agent.slug}.toml`,
    };
    if (model) entry.model = model;
    if (fm.reasoning_effort) entry.model_reasoning_effort = fm.reasoning_effort;
    if (sandbox_mode) entry.sandbox_mode = sandbox_mode;

    agentEntries[agent.slug] = entry;
  }

  const content = stringifyToml({ agents: agentEntries } as unknown as Parameters<
    typeof stringifyToml
  >[0]);

  return {
    tool: 'codex-config',
    relativePath: '.codex/config.toml',
    content,
  };
};
