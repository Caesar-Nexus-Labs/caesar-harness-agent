import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { claudePluginEmitter } from '../emitters/adapters/claude/claude-plugin.js';
import { cursorMdcEmitter } from '../emitters/adapters/cursor/cursor-mdc.js';
import type { EmitContext } from '../emitters/core/emitter-interface.js';
import { rooYamlEmitter } from '../emitters/adapters/roo/roo-yaml.js';
import type { CanonicalAgent } from '../loader/agent-file-loader.js';

// E2E tests for multi-format emitter outputs.
// Validates output structure of all three new emitters against edge-case inputs
// without requiring a full build pipeline. Uses in-memory fixtures.

const ctx: EmitContext = { distRoot: '/tmp/dist' };

/** Build a minimal canonical agent for E2E tests. */
function makeAgent(overrides: {
  name: string;
  description: string;
  category?: string;
  permission?: 'read-only' | 'edit' | 'full';
  body?: string;
}): CanonicalAgent {
  const body =
    overrides.body ??
    [
      '## Role & Expertise',
      'An expert agent.',
      '',
      '## When to Use',
      'When needed.',
      '',
      '## Workflow',
      '1. Do the work.',
      '',
      '## Checklist & Heuristics',
      '- Quality first.',
      '',
      '## Output Contract',
      'A report.',
      '',
      '## Boundaries',
      'Scope limited.',
    ].join('\n');

  return {
    frontmatter: {
      name: overrides.name,
      description: overrides.description,
      category: overrides.category ?? '01-core-development',
      model: 'inherit',
      permission: overrides.permission ?? 'read-only',
      tools: [],
    },
    body,
    slug: overrides.name,
    path: `/agents/${overrides.category ?? '01-core-development'}/${overrides.name}.md`,
    bodyWarnings: [],
  };
}

// ─── Claude Plugin E2E ────────────────────────────────────────────────────────

describe('Multi-Format E2E: claudePluginEmitter (marketplace.json)', () => {
  const agents = [
    makeAgent({
      name: 'code-reviewer',
      description: 'Reviews code for quality and security issues.',
    }),
    makeAgent({
      name: 'test-writer',
      description: 'Writes automated tests for code coverage.',
      permission: 'edit',
    }),
    makeAgent({
      name: 'security-auditor',
      description: 'Audits system for security vulnerabilities.',
      category: '04-quality-security',
    }),
  ];

  it('produces parseable JSON for all agents', () => {
    const file = claudePluginEmitter(agents, ctx);
    expect(() => JSON.parse(file.content)).not.toThrow();
  });

  it('every agent entry is type=subagent with correct agentPath', () => {
    const { agents: entries } = JSON.parse(claudePluginEmitter(agents, ctx).content) as {
      agents: { type: string; agentPath: string; id: string }[];
    };
    for (const entry of entries) {
      expect(entry.type).toBe('subagent');
      expect(entry.agentPath).toBe(`.claude/agents/${entry.id}.md`);
    }
  });

  it('handles agents with special characters in description (JSON safe)', () => {
    const specialAgent = makeAgent({
      name: 'special-agent',
      description: 'Handles "quoted" text, colons: like this, and <html> tags safely.',
    });
    const file = claudePluginEmitter([specialAgent], ctx);
    expect(() => JSON.parse(file.content)).not.toThrow();
    const { agents: entries } = JSON.parse(file.content) as {
      agents: { description: string }[];
    };
    expect(entries[0]!.description).toContain('"quoted"');
  });
});

// ─── Roo YAML E2E ────────────────────────────────────────────────────────────

describe('Multi-Format E2E: rooYamlEmitter (.roomodes)', () => {
  it('handles unescaped backtick-heavy markdown body without YAML corruption', () => {
    const agent = makeAgent({
      name: 'code-specialist',
      description: 'Specialist for complex code with backticks and special chars.',
      body: [
        '## Role & Expertise',
        'You handle ```code``` blocks and `inline code` safely.',
        '',
        '## When to Use',
        'With `yaml: value: nested` content.',
        '',
        '## Workflow',
        '```bash\necho "hello: world"\n```',
        '',
        '## Checklist & Heuristics',
        '- Items with colon: value pairs.',
        '- Items with "quotes" and \'apostrophes\'.',
        '',
        '## Output Contract',
        'Returns {json: "safe"} output.',
        '',
        '## Boundaries',
        'Never use `---` separator in output.',
      ].join('\n'),
    });

    const file = rooYamlEmitter([agent], ctx);
    expect(() => parseYaml(file.content)).not.toThrow();

    const parsed = parseYaml(file.content) as { customModes: { slug: string }[] };
    expect(parsed.customModes).toHaveLength(1);
    expect(parsed.customModes[0]!.slug).toBe('code-specialist');
  });

  it('handles HTML blocks without YAML breakage', () => {
    const agent = makeAgent({
      name: 'html-expert',
      description: 'Expert for HTML and web content with safe parsing of markup.',
      body: [
        '## Role & Expertise',
        'You process <div class="test"> and <br/> tags.',
        '',
        '## When to Use',
        'For HTML: <p>content</p> and &amp; entities.',
        '',
        '## Workflow',
        '1. Parse HTML. 2. Extract. 3. Report.',
        '',
        '## Checklist & Heuristics',
        '- Validate <script> removal.',
        '',
        '## Output Contract',
        '<output>Safe text</output>',
        '',
        '## Boundaries',
        'No raw <script> injection.',
      ].join('\n'),
    });

    const file = rooYamlEmitter([agent], ctx);
    expect(() => parseYaml(file.content)).not.toThrow();
  });

  it('.roomodes output has no stray frontmatter --- delimiters at top level', () => {
    const agents = [
      makeAgent({ name: 'agent-a', description: 'First agent for testing delimiter safety.' }),
      makeAgent({
        name: 'agent-b',
        description: 'Second agent for testing YAML output cleanliness.',
      }),
    ];
    const file = rooYamlEmitter(agents, ctx);
    // The output is raw YAML — no --- frontmatter delimiters at top level
    const lines = file.content.split('\n');
    const leadingDashes = lines.filter((l) => l === '---');
    expect(leadingDashes).toHaveLength(0);
  });
});

// ─── Cursor MDC E2E ──────────────────────────────────────────────────────────

describe('Multi-Format E2E: cursorMdcEmitter (.cursor/rules/*.mdc)', () => {
  it('each agent gets an independent .mdc file (no shared state)', () => {
    const agents = [
      makeAgent({ name: 'rust-expert', description: 'Expert in Rust async programming.' }),
      makeAgent({ name: 'python-expert', description: 'Expert in Python data science.' }),
    ];
    const files = agents.map((a) => cursorMdcEmitter(a, ctx));
    expect(files[0]!.relativePath).toBe('.cursor/rules/rust-expert.mdc');
    expect(files[1]!.relativePath).toBe('.cursor/rules/python-expert.mdc');
    // Contents should differ
    expect(files[0]!.content).not.toBe(files[1]!.content);
  });

  it('no duplicate frontmatter — content has exactly one frontmatter block (2 --- markers)', () => {
    const agent = makeAgent({
      name: 'boundary-tester',
      description: 'Tests output boundary conditions across formats.',
    });
    const file = cursorMdcEmitter(agent, ctx);
    const content = file.content;
    // Count --- occurrences at start of line (opening + closing of one block = 2)
    const frontmatterMatches = content.match(/^---$/gm);
    expect(frontmatterMatches?.length).toBe(2);
  });

  it('TypeScript language hint derives correct globs', () => {
    const agent = makeAgent({
      name: 'ts-specialist',
      description: 'TypeScript specialist for type-safe API development.',
    });
    const file = cursorMdcEmitter(agent, ctx);
    expect(file.content).toContain('**/*.ts');
    expect(file.content).toContain('**/*.tsx');
  });

  it('Rust language hint derives Rust globs', () => {
    const agent = makeAgent({
      name: 'rust-specialist',
      description: 'Rust systems programming expert for performance-critical code.',
    });
    const file = cursorMdcEmitter(agent, ctx);
    expect(file.content).toContain('**/*.rs');
  });

  it('generic agent without language hints has no globs', () => {
    const agent = makeAgent({
      name: 'general-reviewer',
      description: 'Code review specialist for quality, maintainability, and best practices.',
    });
    const file = cursorMdcEmitter(agent, ctx);
    expect(file.content).not.toContain('globs:');
  });
});
