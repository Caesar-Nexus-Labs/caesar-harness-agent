import type { CanonicalAgent } from '../loader/agent-file-loader.js';
import { getToolTargetMeta } from '../mapping/tool-targets.js';
import type { EmitContext, EmittedFile } from './emitter-interface.js';
import {
  type FrontmatterValue,
  serializeMarkdownAgent,
} from './markdown-frontmatter-serializer.js';

// gemini emitter: CanonicalAgent → `.gemini/agents/{slug}.md`.
// YAML-frontmatter markdown (deterministic key order). Body = the 6-section prompt. Pure.
//
// INHERIT-ONLY (user decision 2026-06-01, 92% official): emit name + description + `kind: local`
// ONLY. NO `tools`/`model` — the agent inherits the Gemini session's tool surface + model. This
// dodges shipping unverified Gemini tool-ids (grep_search vs search_file_content) the in-repo
// validator can't catch, and matches the locked inherit budget. Same low-fidelity mold as
// OpenHands; only the path (flat vs nested) + the constant `kind` key differ.

/** Fixed frontmatter key order → stable snapshots regardless of object assembly. */
const GEMINI_KEY_ORDER = ['name', 'description', 'kind'] as const;

export function geminiEmitter(agent: CanonicalAgent, _ctx: EmitContext): EmittedFile {
  const fm = agent.frontmatter;

  const data: Record<string, FrontmatterValue | undefined> = {
    name: agent.slug,
    description: fm.description.trim(),
    kind: 'local',
  };

  const content = serializeMarkdownAgent(data, GEMINI_KEY_ORDER, agent.body);
  const { outputSubdir } = getToolTargetMeta('gemini');

  return {
    tool: 'gemini',
    relativePath: `${outputSubdir}/${agent.slug}.md`,
    content,
  };
}
