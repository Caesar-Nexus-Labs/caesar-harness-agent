import { describe, expect, it } from 'vitest';
import { PluginManifestSchema } from './plugin-manifest-schema.js';

describe('PluginManifestSchema', () => {
  it('validates a correct manifest', () => {
    const valid = {
      type: 'agent-plugin',
      schemaVersion: 1,
      categories: ['02-language-specialists'],
      agentCount: 28,
      agentSlugs: ['typescript-pro', 'rust-engineer'],
      supportedTools: ['claude', 'opencode', 'kiro'],
    };

    expect(() => PluginManifestSchema.parse(valid)).not.toThrow();
  });

  it('allows omitting agentSlugs', () => {
    const valid = {
      type: 'agent-plugin',
      schemaVersion: 1,
      categories: ['02-language-specialists'],
      agentCount: 28,
      supportedTools: ['claude', 'opencode', 'kiro'],
    };

    expect(() => PluginManifestSchema.parse(valid)).not.toThrow();
  });

  it('throws on wrong type', () => {
    const invalid = {
      type: 'wrong-type',
      schemaVersion: 1,
      categories: ['02-language-specialists'],
      agentCount: 28,
      supportedTools: ['claude', 'opencode', 'kiro'],
    };

    expect(() => PluginManifestSchema.parse(invalid)).toThrow();
  });

  it('throws on missing required fields', () => {
    const invalid = {
      type: 'agent-plugin',
      // missing schemaVersion
      categories: ['02-language-specialists'],
      agentCount: 28,
      supportedTools: ['claude', 'opencode', 'kiro'],
    };

    expect(() => PluginManifestSchema.parse(invalid)).toThrow();
  });

  it('throws on invalid tool target', () => {
    const invalid = {
      type: 'agent-plugin',
      schemaVersion: 1,
      categories: ['02-language-specialists'],
      agentCount: 28,
      supportedTools: ['claude', 'opencode', 'not-a-real-tool'],
    };

    expect(() => PluginManifestSchema.parse(invalid)).toThrow();
  });
});
