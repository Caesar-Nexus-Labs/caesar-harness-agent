import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { CAESAR_AGENTS_CORE_VERSION } from '../../../version.js';
import type { AggregateEmitter, EmitContext, EmittedFile } from '../../core/emitter-interface.js';

// Gemini CLI extension manifest emitter: ALL agents → `gemini-extension.json`.
// Pure (no I/O).

interface GeminiExtensionManifest {
  name: string;
  version: string;
  description: string;
  contextFileName: string;
  agentsDir: string;
  skillsDir: string;
  agentCount: number;
}

export const geminiExtensionEmitter: AggregateEmitter = (
  agents: readonly CanonicalAgent[],
  _ctx: EmitContext,
): EmittedFile => {
  const manifest: GeminiExtensionManifest = {
    name: 'caesar-harness-agent',
    version: CAESAR_AGENTS_CORE_VERSION,
    description:
      'The definitive collection of harness subagents for specialized development tasks.',
    contextFileName: 'AGENTS.md',
    agentsDir: '.gemini/agents',
    skillsDir: '.agents/skills',
    agentCount: agents.length,
  };

  return {
    tool: 'gemini-extension',
    relativePath: 'gemini-extension.json',
    content: `${JSON.stringify(manifest, null, 2)}\n`,
  };
};
