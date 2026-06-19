import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import type { EmitContext } from '../../core/emitter-interface.js';
import { buildAgent } from '../pilot/pilot-emitter-test-fixtures.js';
import { rooYamlEmitter } from './roo-yaml.js';

const ctx: EmitContext = { distRoot: '/tmp/dist' };

/** 3 fixtures across 2 categories: 1 read-only, 1 edit, 1 full. */
function fixtures() {
  const readOnly = buildAgent({
    name: 'security-auditor',
    description: 'Read-only security auditor for vulnerability review and threat assessment.',
    category: '02-language-specialists',
    permission: 'read-only',
    tools: [],
  });
  const edit = buildAgent({
    name: 'test-writer',
    description: 'Writes and maintains automated tests for new and changed code paths.',
    category: '01-core-development',
    permission: 'edit',
    tools: ['read', 'edit', 'write'],
  });
  const full = buildAgent({
    name: 'feature-builder',
    description: 'Implements features end-to-end across the codebase with full tooling.',
    category: '01-core-development',
    permission: 'full',
    tools: ['read', 'edit', 'write', 'bash'],
  });
  return { readOnly, edit, full };
}

describe('rooYamlEmitter', () => {
  it('emits to .roomodes (not .kilocodemodes)', () => {
    const { readOnly, edit, full } = fixtures();
    const file = rooYamlEmitter([readOnly, edit, full], ctx);
    expect(file.tool).toBe('roo');
    expect(file.relativePath).toBe('.roomodes');
  });

  it('produces valid YAML with customModes array', () => {
    const { readOnly, edit, full } = fixtures();
    const file = rooYamlEmitter([readOnly, edit, full], ctx);
    expect(() => parseYaml(file.content)).not.toThrow();
    const parsed = parseYaml(file.content) as { customModes: unknown[] };
    expect(Array.isArray(parsed.customModes)).toBe(true);
    expect(parsed.customModes).toHaveLength(3);
  });

  it('sorts by category asc then slug asc', () => {
    const { readOnly, edit, full } = fixtures();
    const parsed = parseYaml(rooYamlEmitter([readOnly, edit, full], ctx).content) as {
      customModes: { slug: string }[];
    };
    // 01-core-development (feature-builder, test-writer) then 02-language-specialists (security-auditor)
    expect(parsed.customModes.map((m) => m.slug)).toEqual([
      'feature-builder',
      'test-writer',
      'security-auditor',
    ]);
  });

  it('maps groups correctly per permission tier', () => {
    const { readOnly, edit, full } = fixtures();
    const parsed = parseYaml(rooYamlEmitter([readOnly, edit, full], ctx).content) as {
      customModes: { slug: string; groups: string[] }[];
    };
    const bySlug = new Map(parsed.customModes.map((m) => [m.slug, m.groups]));
    expect(bySlug.get('security-auditor')).toEqual(['read']);
    expect(bySlug.get('test-writer')).toEqual(['read', 'edit']);
    expect(bySlug.get('feature-builder')).toEqual(['read', 'edit', 'command']);
  });

  it('every mode has slug, name, roleDefinition, groups, description', () => {
    const { readOnly, edit, full } = fixtures();
    const parsed = parseYaml(rooYamlEmitter([readOnly, edit, full], ctx).content) as {
      customModes: Record<string, unknown>[];
    };
    for (const mode of parsed.customModes) {
      expect(typeof mode.slug).toBe('string');
      expect(typeof mode.name).toBe('string');
      expect(typeof mode.roleDefinition).toBe('string');
      expect((mode.roleDefinition as string).length).toBeGreaterThan(0);
      expect(Array.isArray(mode.groups)).toBe(true);
      expect(typeof mode.description).toBe('string');
      // Should NOT have model, iconName, source, fileRegex
      expect('model' in mode).toBe(false);
      expect('iconName' in mode).toBe(false);
      expect('source' in mode).toBe(false);
      expect('fileRegex' in mode).toBe(false);
    }
  });

  it('YAML with deeply nested markdown code blocks does not corrupt — no duplicate frontmatter', () => {
    // Test "ugly" markdown: unescaped backticks, HTML blocks, varied indentation
    const uglyBody = [
      '## Role & Expertise',
      'Expert with ```code blocks``` and <html> tags.',
      '',
      '## When to Use',
      'When you need to handle `yaml: key: value` inline.',
      '',
      '## Workflow',
      '```yaml',
      'key: value',
      '  nested: data',
      '```',
      '',
      '## Checklist & Heuristics',
      '- Item with colon: value',
      '- Item with "quotes"',
      '',
      '## Output Contract',
      'Returns `{json: "data"}` safely.',
      '',
      '## Boundaries',
      'Never emit `---` frontmatter delimiters.',
    ].join('\n');

    const agent = buildAgent({}, uglyBody);
    const file = rooYamlEmitter([agent], ctx);

    // Must parse without throwing
    expect(() => parseYaml(file.content)).not.toThrow();

    // Must NOT contain a duplicate frontmatter block (--- at top level)
    const lines = file.content.split('\n');
    const dashLines = lines.filter((l) => l.trim() === '---');
    expect(dashLines).toHaveLength(0); // YAML content, no frontmatter delimiters at top
  });

  it('does not emit YAML anchors/aliases on large agent sets (no context overflow)', () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      buildAgent({
        name: `agent-${String(i).padStart(3, '0')}`,
        description: `Edit-tier agent number ${i} for round-trip scale testing of the roo emitter.`,
        permission: 'edit',
        tools: ['read', 'edit'],
      }),
    );
    const content = rooYamlEmitter(many, ctx).content;
    expect(content).not.toMatch(/:\s+&[A-Za-z0-9]/); // no anchor definitions
    expect(content).not.toMatch(/\*[A-Za-z0-9]+\s*$/m); // no alias references
    const parsed = parseYaml(content) as { customModes: unknown[] };
    expect(parsed.customModes).toHaveLength(60);
  });

  it('snapshot', () => {
    const { readOnly, edit, full } = fixtures();
    expect(rooYamlEmitter([readOnly, edit, full], ctx).content).toMatchSnapshot();
  });
});
