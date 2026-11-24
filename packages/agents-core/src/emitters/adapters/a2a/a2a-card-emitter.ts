import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { CAESAR_AGENTS_CORE_VERSION } from '../../../version.js';
import type { AggregateEmitter, EmitContext, EmittedFile } from '../../core/emitter-interface.js';

// A2A (Agent2Agent) Agent Card emitter: ALL agents → `.well-known/agent-card.json`.
// Pure (no I/O).

interface A2ASkillEntry {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

interface A2AAgentCard {
  protocolVersion: string;
  name: string;
  version: string;
  description: string;
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
  };
  skills: A2ASkillEntry[];
}

export const a2aCardEmitter: AggregateEmitter = (
  agents: readonly CanonicalAgent[],
  _ctx: EmitContext,
): EmittedFile => {
  const sorted = [...agents].sort((a, b) => a.slug.localeCompare(b.slug));
  const card: A2AAgentCard = {
    protocolVersion: '1.0',
    name: 'Caesar Harness Agent',
    version: CAESAR_AGENTS_CORE_VERSION,
    description:
      'The definitive collection of harness subagents for specialized development tasks.',
    capabilities: {
      streaming: true,
      pushNotifications: false,
    },
    skills: sorted.map((a) => ({
      id: a.slug,
      name: a.frontmatter.name,
      description: a.frontmatter.description.trim(),
      tags: [a.frontmatter.category, a.frontmatter.permission],
    })),
  };

  return {
    tool: 'a2a-card',
    relativePath: '.well-known/agent-card.json',
    content: `${JSON.stringify(card, null, 2)}\n`,
  };
};
