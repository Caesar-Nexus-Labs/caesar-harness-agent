import type { CanonicalAgent } from '../loader/agent-file-loader.js';
import { mapModel } from '../mapping/model-alias-map.js';
import { getToolTargetMeta } from '../mapping/tool-targets.js';
import { mapTools } from '../mapping/tools-map.js';
import { TOOLS } from '../schema/enums.js';
import type { EmitContext, EmittedFile } from './emitter-interface.js';

// kiro emitter: CanonicalAgent → `.kiro/agents/{name}.json`.
// JSON via JSON.stringify(_, null, 2) with DETERMINISTIC key order (object built in a fixed
// order). Fields (kiro.dev/docs/cli/custom-agents/configuration-reference, verified 2026-05-30):
//   name         → fm.name
//   description  → fm.description (trimmed; routing signal)
//   prompt       → agent.body (the 6-section prompt verbatim)
//   tools        → mapTools(...,'kiro',...) full tool surface the agent CAN use
//   allowedTools → the auto-approved (no-prompt) subset: read-only tools only, so a regression
//                  can never silently auto-approve write/shell for a read-only agent (G5/§2)
//   model        → mapModel(...,'kiro') bare id (claude-sonnet-4); omitted on inherit
//
// Kiro has no sandbox/permission field — access is gated purely by tools + allowedTools.

/** Kiro built-in tools that never mutate state (auto-approvable for any tier). */
const KIRO_READ_ONLY_IDS: ReadonlySet<string> = new Set(['read', 'fetch']);

/** Shape of a Kiro agent config file (only the fields we emit). */
interface KiroAgentConfig {
  name: string;
  description: string;
  prompt: string;
  tools: string[];
  allowedTools: string[];
  model?: string;
}

export function kiroEmitter(agent: CanonicalAgent, ctx: EmitContext): EmittedFile {
  const fm = agent.frontmatter;

  // mapTools may return undefined (unrestricted edit/full) → fall back to the full Kiro
  // tool surface (every canonical tool mapped + deduped to its Kiro id).
  const tools = mapTools(fm.tools, 'kiro', fm.permission) ?? mapTools(TOOLS, 'kiro', 'full') ?? [];
  // Auto-approve only the read-only-safe tools; everything else prompts at runtime.
  const allowedTools = tools.filter((id) => KIRO_READ_ONLY_IDS.has(id));
  const model = mapModel(fm.model, 'kiro', {
    modelProvider: ctx.modelProvider,
    overrides: ctx.modelOverrides,
  });

  const config: KiroAgentConfig = {
    name: fm.name,
    description: fm.description.trim(),
    prompt: agent.body.replace(/\r\n?/g, '\n').trim(),
    tools,
    allowedTools,
    ...(model !== undefined ? { model } : {}),
  };

  const content = `${JSON.stringify(config, null, 2)}\n`;
  const { outputSubdir } = getToolTargetMeta('kiro');

  return {
    tool: 'kiro',
    relativePath: `${outputSubdir}/${agent.slug}.json`,
    content,
  };
}
