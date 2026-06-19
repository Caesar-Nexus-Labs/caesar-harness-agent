import { describe, expect, it } from 'vitest';
import type { EmitContext } from '../../core/emitter-interface.js';
import {
  buildAgent,
  fullPermissionAgent,
  readOnlyAgent,
} from '../pilot/pilot-emitter-test-fixtures.js';
import { claudePluginEmitter } from './claude-plugin.js';

const ctx: EmitContext = { distRoot: '/tmp/dist' };

describe('claudePluginEmitter', () => {
  it('emits two files under .claude-plugin/', () => {
    const files = claudePluginEmitter([buildAgent()], ctx);
    expect(files).toHaveLength(2);
    
    const marketplaceFile = files.find((f) => f.relativePath === '.claude-plugin/marketplace.json');
    const pluginFile = files.find((f) => f.relativePath === '.claude-plugin/plugin.json');
    
    expect(marketplaceFile).toBeDefined();
    expect(pluginFile).toBeDefined();
    
    expect(marketplaceFile?.tool).toBe('claude-plugin');
    expect(pluginFile?.tool).toBe('claude-plugin');
  });

  it('produces valid JSON content for both files', () => {
    const files = claudePluginEmitter([buildAgent()], ctx);
    const marketplaceFile = files.find((f) => f.relativePath === '.claude-plugin/marketplace.json')!;
    const pluginFile = files.find((f) => f.relativePath === '.claude-plugin/plugin.json')!;
    
    expect(() => JSON.parse(marketplaceFile.content)).not.toThrow();
    expect(() => JSON.parse(pluginFile.content)).not.toThrow();
  });

  it('marketplace manifest includes schemaVersion, name, description, owner, plugins array', () => {
    const files = claudePluginEmitter([buildAgent()], ctx);
    const marketplaceFile = files.find((f) => f.relativePath === '.claude-plugin/marketplace.json')!;
    const manifest = JSON.parse(marketplaceFile.content) as {
      schemaVersion: string;
      name: string;
      description: string;
      owner: { name: string; email?: string };
      plugins: unknown[];
    };
    expect(manifest.schemaVersion).toBe('1.0');
    expect(manifest.name).toBe('caesar-harness-agent');
    expect(typeof manifest.description).toBe('string');
    expect(typeof manifest.owner).toBe('object');
    expect(manifest.owner.name).toBe('Caesar Nexus Labs');
    expect(Array.isArray(manifest.plugins)).toBe(true);
  });

  it('each plugin entry has name, description, version, author, source, category', () => {
    const agent = buildAgent();
    const files = claudePluginEmitter([agent], ctx);
    const marketplaceFile = files.find((f) => f.relativePath === '.claude-plugin/marketplace.json')!;
    const { plugins } = JSON.parse(marketplaceFile.content) as {
      plugins: {
        name: string;
        description: string;
        version: string;
        author: { name: string; email?: string };
        source: string;
        category: string;
      }[];
    };
    expect(plugins).toHaveLength(1);
    const entry = plugins[0]!;
    expect(entry.name).toBe('caesar-harness-agent');
    expect(typeof entry.description).toBe('string');
    expect(entry.version).toBe('0.1.0');
    expect(entry.author.name).toBe('Caesar Nexus Labs');
    expect(entry.source).toBe('./');
    expect(entry.category).toBe('development');
  });

  it('plugin.json references correct manifestPath and agentsDir', () => {
    const files = claudePluginEmitter([buildAgent()], ctx);
    const pluginFile = files.find((f) => f.relativePath === '.claude-plugin/plugin.json')!;
    const config = JSON.parse(pluginFile.content) as {
      schemaVersion: string;
      name: string;
      version: string;
      description: string;
      manifestPath: string;
      agentsDir: string;
    };
    expect(config.schemaVersion).toBe('1.0');
    expect(config.name).toBe('caesar-harness-agent');
    expect(config.version).toBe('0.1.0');
    expect(config.manifestPath).toBe('.claude-plugin/marketplace.json');
    expect(config.agentsDir).toBe('claude-agents');
  });

  it('snapshot for marketplace.json', () => {
    const agents = [readOnlyAgent(), buildAgent()];
    const files = claudePluginEmitter(agents, ctx);
    const marketplaceFile = files.find((f) => f.relativePath === '.claude-plugin/marketplace.json')!;
    expect(marketplaceFile.content).toMatchSnapshot();
  });

  it('snapshot for plugin.json', () => {
    const agents = [readOnlyAgent(), buildAgent()];
    const files = claudePluginEmitter(agents, ctx);
    const pluginFile = files.find((f) => f.relativePath === '.claude-plugin/plugin.json')!;
    expect(pluginFile.content).toMatchSnapshot();
  });
});
