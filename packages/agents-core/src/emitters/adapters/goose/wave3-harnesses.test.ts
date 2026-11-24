import { describe, expect, it } from 'vitest';
import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { a2aCardEmitter } from '../a2a/a2a-card-emitter.js';
import { gooseEmitter } from './goose-emitter.js';

const agent: CanonicalAgent = {
  slug: 'sre-engineer',
  category: '03-infrastructure',
  sourcePath: 'agents/03-infrastructure/sre-engineer.md',
  frontmatter: {
    name: 'sre-engineer',
    description: 'Site reliability engineer for SLOs, alerting, and incident response.',
    category: '03-infrastructure',
    model: 'balanced',
    permission: 'edit',
    tools: ['read', 'grep', 'glob', 'edit'],
    mcp_servers: ['context7'],
  },
  body: '## Role & Expertise\n\nSRE specialist.\n',
};

describe('Wave 3 harnesses (Goose & A2A Agent Card)', () => {
  it('emits Goose agent file (.goose/agents/{slug}.md)', () => {
    const out = gooseEmitter(agent, { distRoot: 'dist' });
    expect(out.tool).toBe('goose');
    expect(out.relativePath).toBe('.goose/agents/sre-engineer.md');
    expect(out.content).toContain('mcpServers:');
    expect(out.content).toContain('context7');
  });

  it('emits valid A2A Agent Card (.well-known/agent-card.json)', () => {
    const out = a2aCardEmitter([agent], { distRoot: 'dist' });
    expect(Array.isArray(out)).toBe(false);
    if (!Array.isArray(out)) {
      expect(out.relativePath).toBe('.well-known/agent-card.json');
      const parsed = JSON.parse(out.content) as {
        protocolVersion: string;
        skills: Array<{ id: string }>;
      };
      expect(parsed.protocolVersion).toBe('1.0');
      expect(parsed.skills[0]?.id).toBe('sre-engineer');
    }
  });
});
