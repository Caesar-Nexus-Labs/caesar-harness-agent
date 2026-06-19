import { stringify as stringifyYaml } from 'yaml';
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

/** One agent entry in the marketplace manifest. */
interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  /** Agent type: always "subagent" for canonical agents (not rule/tool). */
  type: 'subagent';
  /** Relative path from plugin root to the agent markdown file. */
  agentPath: string;
}

/** The top-level marketplace manifest shape. */
interface MarketplaceManifest {
  schemaVersion: string;
  name: string;
  description: string;
  agents: MarketplaceAgent[];
}

/** The plugin.json activation config. */
interface PluginConfig {
  schemaVersion: string;
  manifestPath: string;
  agentsDir: string;
}

/** Derive a display name from a kebab-case slug. */
function displayName(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length > 0 ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Sort agents by category asc, then slug asc — deterministic output. */
function sortByCategoryThenSlug(agents: readonly CanonicalAgent[]): CanonicalAgent[] {
  return [...agents].sort((a, b) => {
    const cat = a.frontmatter.category.localeCompare(b.frontmatter.category);
    return cat !== 0 ? cat : a.slug.localeCompare(b.slug);
  });
}

/**
 * Claude Plugin AGGREGATE emitter.
 * Produces two files:
 *   - `.claude-plugin/marketplace.json` — full agent registry for the marketplace
 *   - `.claude-plugin/plugin.json`      — activation config referencing the manifest
 */
export const claudePluginEmitter: AggregateEmitter = (
  agents: readonly CanonicalAgent[],
  _ctx: EmitContext,
): EmittedFile => {
  const sorted = sortByCategoryThenSlug(agents);

  const marketplaceAgents: MarketplaceAgent[] = sorted.map((agent) => ({
    id: agent.slug,
    name: displayName(agent.slug),
    description: agent.frontmatter.description.trim(),
    category: agent.frontmatter.category,
    type: 'subagent',
    agentPath: `claude-agents/${agent.slug}.md`,
  }));

  const manifest: MarketplaceManifest = {
    schemaVersion: '1.0',
    name: 'Caesar Harness Agent',
    description:
      'The definitive collection of harness subagents for specialized development tasks.',
    agents: marketplaceAgents,
  };

  // Return the marketplace.json as the primary emitted file.
  // plugin.json is bundled inside the content via a JSON Lines separator — the write-outputs
  // layer reads both as a single EmittedFile payload. To keep the emitter interface (one file
  // per call) clean, we encode plugin.json inline in a well-known compound format used by
  // multi-file aggregate emitters: `\n---claude-plugin---\n{plugin.json content}`.
  const pluginConfig: PluginConfig = {
    schemaVersion: '1.0',
    manifestPath: '.claude-plugin/marketplace.json',
    agentsDir: 'claude-agents',
  };

  // Primary output: marketplace.json. The plugin.json is written by a companion emitter
  // (claudePluginConfigEmitter) registered separately to keep the interface clean.
  return {
    tool: 'claude-plugin',
    relativePath: '.claude-plugin/marketplace.json',
    content: JSON.stringify(manifest, null, 2) + '\n',
  };
};

/**
 * Claude Plugin config emitter — companion to claudePluginEmitter.
 * Produces `.claude-plugin/plugin.json` (activation config).
 */
export const claudePluginConfigEmitter: AggregateEmitter = (
  _agents: readonly CanonicalAgent[],
  _ctx: EmitContext,
): EmittedFile => {
  const pluginConfig: PluginConfig = {
    schemaVersion: '1.0',
    manifestPath: '.claude-plugin/marketplace.json',
    agentsDir: 'claude-agents',
  };

  return {
    tool: 'claude-plugin',
    relativePath: '.claude-plugin/plugin.json',
    content: JSON.stringify(pluginConfig, null, 2) + '\n',
  };
};
