import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { CAESAR_AGENTS_CORE_VERSION } from '../../../version.js';
import type { AggregateEmitter, EmitContext, EmittedFile } from '../../core/emitter-interface.js';

// Qwen Code extension manifest emitter: ALL agents → `qwen-extension.json`.
// Pure (no I/O).

interface QwenExtensionManifest {
  name: string;
  version: string;
  description: string;
  skills: string[];
}

export const qwenExtensionEmitter: AggregateEmitter = (
  agents: readonly CanonicalAgent[],
  _ctx: EmitContext,
): EmittedFile => {
  const sortedSlugs = [...agents].map((a) => a.slug).sort();
  const manifest: QwenExtensionManifest = {
    name: 'caesar-harness-agent',
    version: CAESAR_AGENTS_CORE_VERSION,
    description:
      'The definitive collection of harness subagents for specialized development tasks.',
    skills: sortedSlugs.map((slug) => `.qwen/skills/${slug}/SKILL.md`),
  };

  return {
    tool: 'qwen-extension',
    relativePath: 'qwen-extension.json',
    content: `${JSON.stringify(manifest, null, 2)}\n`,
  };
};
