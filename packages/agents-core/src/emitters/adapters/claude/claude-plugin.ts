import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import type { AggregateEmitter, EmitContext, EmittedFile } from '../../core/emitter-interface.js';

// Claude Code plugin emitter: ALL agents → two files under `.claude-plugin/`:
//   - marketplace.json  — top-level manifest listing all agents with metadata
//   - plugin.json       — per-install activation config (references marketplace.json)
//
// This is the Claude Marketplace distribution format for publishing agent collections
// as a single installable plugin. Pure (no I/O).
//
// Format reference (verified 2026-06-16): Claude plugin spec requires a `marketplace.json`
// at `.claude-plugin/marketplace.json` describing each agent (id, name, description, type),
// plus a `plugin.json` referencing the agent directory.

/** One plugin entry in the marketplace manifest. */
interface MarketplacePlugin {
  name: string;
  description: string;
  version: string;
  author: {
    name: string;
    email?: string;
  };
  /** Relative path or Git repository source. */
  source: string;
  category: string;
}

/** The top-level marketplace manifest shape. */
interface MarketplaceManifest {
  $schema?: string;
  schemaVersion: string;
  name: string;
  description: string;
  owner: {
    name: string;
    email?: string;
  };
  plugins: MarketplacePlugin[];
}

/** The plugin.json activation config. */
interface PluginConfig {
  schemaVersion: string;
  name: string;
  version: string;
  description: string;
  manifestPath: string;
  agentsDir: string;
}

export const claudePluginEmitter: AggregateEmitter = (
  _agents: readonly CanonicalAgent[],
  _ctx: EmitContext,
): EmittedFile[] => {
  const manifest: MarketplaceManifest = {
    $schema: 'https://json.schemastore.org/claude-code-marketplace.json',
    schemaVersion: '1.0',
    name: 'caesar-harness-agent',
    description:
      'The definitive collection of harness subagents for specialized development tasks.',
    owner: {
      name: 'Caesar Nexus Labs',
      email: 'contact@caesarnexuslabs.com',
    },
    plugins: [
      {
        name: 'caesar-harness-agent',
        description:
          'The definitive collection of harness subagents for specialized development tasks.',
        version: '0.1.0',
        author: {
          name: 'Caesar Nexus Labs',
          email: 'contact@caesarnexuslabs.com',
        },
        source: './',
        category: 'development',
      },
    ],
  };

  const pluginConfig: PluginConfig = {
    schemaVersion: '1.0',
    name: 'caesar-harness-agent',
    version: '0.1.0',
    description:
      'The definitive collection of harness subagents for specialized development tasks.',
    manifestPath: '.claude-plugin/marketplace.json',
    agentsDir: 'claude-agents',
  };

  return [
    {
      tool: 'claude-plugin',
      relativePath: '.claude-plugin/marketplace.json',
      content: `${JSON.stringify(manifest, null, 2)}\n`,
    },
    {
      tool: 'claude-plugin',
      relativePath: '.claude-plugin/plugin.json',
      content: `${JSON.stringify(pluginConfig, null, 2)}\n`,
    },
  ];
};

/**
 * Claude Plugin config emitter — companion to claudePluginEmitter.
 * Produces `.claude-plugin/plugin.json` (activation config).
 * @deprecated plugin.json is now emitted directly by claudePluginEmitter.
 */
export const claudePluginConfigEmitter: AggregateEmitter = (
  _agents: readonly CanonicalAgent[],
  _ctx: EmitContext,
): EmittedFile => {
  const pluginConfig: PluginConfig = {
    schemaVersion: '1.0',
    name: 'caesar-harness-agent',
    version: '0.1.0',
    description:
      'The definitive collection of harness subagents for specialized development tasks.',
    manifestPath: '.claude-plugin/marketplace.json',
    agentsDir: 'claude-agents',
  };

  return {
    tool: 'claude-plugin',
    relativePath: '.claude-plugin/plugin.json',
    content: `${JSON.stringify(pluginConfig, null, 2)}\n`,
  };
};
