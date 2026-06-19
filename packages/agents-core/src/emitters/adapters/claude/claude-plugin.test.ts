import { describe, expect, it } from 'vitest';
import type { EmitContext } from '../../core/emitter-interface.js';
import {
  buildAgent,
  fullPermissionAgent,
  readOnlyAgent,
} from '../pilot/pilot-emitter-test-fixtures.js';
import { claudePluginConfigEmitter, claudePluginEmitter } from './claude-plugin.js';

const ctx: EmitContext = { distRoot: '/tmp/dist' };

describe('claudePluginEmitter (marketplace.json)', () => {
  it('emits to .claude-plugin/marketplace.json', () => {
    const file = claudePluginEmitter([buildAgent()], ctx);
    expect(file.tool).toBe('claude-plugin');
    expect(file.relativePath).toBe('.claude-plugin/marketplace.json');
  });

  it('produces valid JSON content', () => {
    const file = claudePluginEmitter([buildAgent()], ctx);
    expect(() => JSON.parse(file.content)).not.toThrow();
  });

  it('manifest includes schemaVersion, name, description, agents array', () => {
    const file = claudePluginEmitter([buildAgent()], ctx);
    const manifest = JSON.parse(file.content) as {
      schemaVersion: string;
      name: string;
      description: string;
      agents: unknown[];
    };
    expect(manifest.schemaVersion).toBe('1.0');
    expect(typeof manifest.name).toBe('string');
    expect(manifest.name.length).toBeGreaterThan(0);
    expect(typeof manifest.description).toBe('string');
    expect(Array.isArray(manifest.agents)).toBe(true);
  });

  it('each agent entry has id, name, description, category, type=subagent, agentPath', () => {
    const agent = buildAgent();
    const file = claudePluginEmitter([agent], ctx);
    const { agents } = JSON.parse(file.content) as {
      agents: {
        id: string;
        name: string;
        description: string;
        category: string;
        type: string;
        agentPath: string;
      }[];
    };
    expect(agents).toHaveLength(1);
    const entry = agents[0]!;
    expect(entry.id).toBe(agent.slug);
    expect(typeof entry.name).toBe('string');
    expect(entry.name.length).toBeGreaterThan(0);
    expect(entry.description).toBe(agent.frontmatter.description.trim());
    expect(entry.category).toBe(agent.frontmatter.category);
    expect(entry.type).toBe('subagent');
    expect(entry.agentPath).toBe(`claude-agents/${agent.slug}.md`);
  });

  it('sorts agents by category asc then slug asc (deterministic order)', () => {
    const a1 = buildAgent({ name: 'zebra-agent', category: '01-core-development' });
    const a2 = buildAgent({ name: 'alpha-agent', category: '01-core-development' });
    const a3 = buildAgent({ name: 'beta-tool', category: '02-language-specialists' });
    const file = claudePluginEmitter([a3, a1, a2], ctx);
    const { agents } = JSON.parse(file.content) as { agents: { id: string }[] };
    expect(agents.map((a) => a.id)).toEqual(['alpha-agent', 'zebra-agent', 'beta-tool']);
  });

  it('handles multiple agents including read-only and full-permission', () => {
    const agents = [readOnlyAgent(), fullPermissionAgent(), buildAgent()];
    const file = claudePluginEmitter(agents, ctx);
    const { agents: entries } = JSON.parse(file.content) as { agents: unknown[] };
    expect(entries).toHaveLength(3);
  });

  it('snapshot', () => {
    const agents = [readOnlyAgent(), buildAgent()];
    expect(claudePluginEmitter(agents, ctx).content).toMatchSnapshot();
  });
});

describe('claudePluginConfigEmitter (plugin.json)', () => {
  it('emits to .claude-plugin/plugin.json', () => {
    const file = claudePluginConfigEmitter([buildAgent()], ctx);
    expect(file.tool).toBe('claude-plugin');
    expect(file.relativePath).toBe('.claude-plugin/plugin.json');
  });

  it('plugin.json references correct manifestPath and agentsDir', () => {
    const file = claudePluginConfigEmitter([buildAgent()], ctx);
    const config = JSON.parse(file.content) as {
      schemaVersion: string;
      manifestPath: string;
      agentsDir: string;
    };
    expect(config.schemaVersion).toBe('1.0');
    expect(config.manifestPath).toBe('.claude-plugin/marketplace.json');
    expect(config.agentsDir).toBe('claude-agents');
  });
});
