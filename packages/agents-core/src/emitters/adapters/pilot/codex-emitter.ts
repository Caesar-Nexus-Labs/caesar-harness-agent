import { stringify as stringifyToml } from '@iarna/toml';
import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { mapModel } from '../../../mapping/model-alias-map.js';
import { mapPermission } from '../../../mapping/permission-map.js';
import { getToolTargetMeta } from '../../../mapping/tool-targets.js';
import type { EmitContext, EmittedFile } from '../../core/emitter-interface.js';

// codex emitter: CanonicalAgent → `.codex/agents/{name}.toml`.
// Flat TOML (deterministic key order via insertion): name, description,
// developer_instructions (= body, emitted as a triple-quoted multiline string),
// model?, model_reasoning_effort?, sandbox_mode?. Pure (no I/O).
//
// CONTRACT (researcher report §1 + spec): Codex per-agent files carry NO tools allowlist —
// the access surface is shaped ONLY by `sandbox_mode`. We therefore drop canonical tools and
// derive sandbox from the permission tier. No global `[agents]` keys in per-agent files.
//
// Field mapping (Phase 03 engine):
//   name                   → fm.name
//   description            → fm.description (trimmed; routing signal)
//   developer_instructions → agent.body (the 6-section prompt verbatim, multiline)
//   model                  → mapModel(...) (gpt-5.5/5.4/5.4-mini; omitted on inherit)
//   model_reasoning_effort → fm.reasoning_effort (low/medium/high; omitted when absent)
//   sandbox_mode           → mapPermission(...).sandbox_mode (read-only/workspace-write/...)

/** Build the ordered TOML object; @iarna/toml preserves insertion order + drops undefined. */
function buildCodexConfig(
  agent: CanonicalAgent,
  ctx: EmitContext,
): Record<string, string | undefined> {
  const fm = agent.frontmatter;
  const model = mapModel(fm.model, 'codex', {
    modelProvider: ctx.modelProvider,
    overrides: ctx.modelOverrides,
  });
  const { sandbox_mode } = mapPermission(fm.permission, 'codex');

  return {
    name: fm.name,
    description: fm.description.trim(),
    // Normalize CRLF/CR → LF so the triple-quoted body is byte-identical across OSes.
    developer_instructions: agent.body.replace(/\r\n?/g, '\n').trim(),
    model,
    model_reasoning_effort: fm.reasoning_effort,
    sandbox_mode,
  };
}

export function codexEmitter(agent: CanonicalAgent, ctx: EmitContext): EmittedFile {
  const config = buildCodexConfig(agent, ctx);
  // @iarna/toml requires a concrete object; undefined-valued keys are dropped on stringify.
  const content = stringifyToml(config as Record<string, string>);
  const { outputSubdir } = getToolTargetMeta('codex');

  return {
    tool: 'codex',
    relativePath: `${outputSubdir}/${agent.slug}.toml`,
    content,
  };
}
