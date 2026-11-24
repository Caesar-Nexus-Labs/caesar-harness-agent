import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseToml } from '@iarna/toml';
import { describe, expect, it } from 'vitest';
import { claudePluginEmitter } from '../emitters/adapters/claude/claude-plugin.js';
import { codexConfigEmitter } from '../emitters/adapters/pilot/codex-config-emitter.js';
import { discoverAgents } from '../loader/agent-discovery.js';
import type { CanonicalAgent } from '../loader/agent-file-loader.js';
import { parseSquadManifest } from './squad-schema.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..', '..');

const v2Agent: CanonicalAgent = {
  slug: 'security-auditor',
  category: '04-quality-security',
  sourcePath: 'agents/04-quality-security/security-auditor.md',
  frontmatter: {
    name: 'security-auditor',
    description: 'Read-only security auditor for code and dependency reviews.',
    category: '04-quality-security',
    model: 'inherit',
    permission: 'read-only',
    tools: ['read', 'grep', 'glob'],
    isolation: 'background',
    mcp_servers: ['context7'],
    hooks: [{ event: 'PreToolUse', matcher: 'run_shell_command', command: 'echo audit-guard' }],
  },
  body: '## Role & Expertise\n\nSecurity auditor.\n',
};

describe('Wave 2: Squads, Claude Plugin v2 & Codex config.toml', () => {
  it('validates all squads/*.yaml and verifies every referenced agent slug exists', () => {
    const knownSlugs = new Set(discoverAgents(REPO_ROOT).map((d) => d.slug));
    for (const file of [
      'fullstack.yaml',
      'security-audit.yaml',
      'infra.yaml',
      'data-ai.yaml',
      'marketing.yaml',
    ]) {
      const content = readFileSync(resolve(REPO_ROOT, 'squads', file), 'utf8');
      const squad = parseSquadManifest(content);
      expect(squad.agents.length).toBeGreaterThan(0);
      for (const slug of squad.agents) {
        expect(knownSlugs.has(slug), `Unknown agent slug "${slug}" in ${file}`).toBe(true);
      }
    }
  });

  it('claudePluginEmitter emits hooks/hooks.json and .mcp.json when agents declare Schema v2', () => {
    const files = claudePluginEmitter([v2Agent], { distRoot: 'dist' });
    expect(Array.isArray(files)).toBe(true);
    if (Array.isArray(files)) {
      const paths = files.map((f) => f.relativePath);
      expect(paths).toContain('hooks/hooks.json');
      expect(paths).toContain('.mcp.json');
    }
  });

  it('codexConfigEmitter emits valid parseable TOML with [agents.<slug>] entries', () => {
    const out = codexConfigEmitter([v2Agent], { distRoot: 'dist' });
    expect(Array.isArray(out)).toBe(false);
    if (!Array.isArray(out)) {
      expect(out.relativePath).toBe('.codex/config.toml');
      const parsed = parseToml(out.content) as {
        agents: Record<string, { prompt_file: string; sandbox_mode: string }>;
      };
      expect(parsed.agents['security-auditor']?.prompt_file).toBe(
        '.codex/agents/security-auditor.toml',
      );
      expect(parsed.agents['security-auditor']?.sandbox_mode).toBe('read-only');
    }
  });
});
