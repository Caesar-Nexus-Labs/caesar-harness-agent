import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import type { EmitContext } from '../../core/emitter-interface.js';
import { kiloEmitter } from './kilo-emitter.js';
import { buildAgent } from './pilot-emitter-test-fixtures.js';

// Kilo AGGREGATE emitter: ALL agents → one `.kilocodemodes` YAML with a `customModes:` array.
// Real per-agent permission via `groups` (plain strings, no fileRegex); NO per-agent model.

const ctx: EmitContext = { distRoot: '/tmp/dist' };

/** 3 fixtures across 2 categories: 1 read-only, 1 edit, 1 full. */
function fixtures() {
  const readOnly = buildAgent({
    name: 'security-auditor',
    description: 'Read-only security auditor for vulnerability review and threat assessment.',
    category: '02-security',
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

describe('kiloEmitter', () => {
  it('emits a single .kilocodemodes file', () => {
    const { readOnly, edit, full } = fixtures();
    const file = kiloEmitter([readOnly, edit, full], ctx);
    expect(file.tool).toBe('kilo');
    expect(file.relativePath).toBe('.kilocodemodes');
  });

  it('produces customModes for every agent in category-asc then slug-asc order', () => {
    const { readOnly, edit, full } = fixtures();
    const file = kiloEmitter([readOnly, edit, full], ctx);
    const parsed = parseYaml(file.content) as { customModes: { slug: string }[] };
    expect(parsed.customModes).toHaveLength(3);
    // 01-core-development (feature-builder, test-writer) then 02-security (security-auditor).
    expect(parsed.customModes.map((m) => m.slug)).toEqual([
      'feature-builder',
      'test-writer',
      'security-auditor',
    ]);
  });

  it('maps groups per permission tier; read-only is exactly [read] (poka-yoke)', () => {
    const { readOnly, edit, full } = fixtures();
    const parsed = parseYaml(kiloEmitter([readOnly, edit, full], ctx).content) as {
      customModes: { slug: string; groups: string[] }[];
    };
    const bySlug = new Map(parsed.customModes.map((m) => [m.slug, m.groups]));
    expect(bySlug.get('security-auditor')).toEqual(['read']);
    expect(bySlug.get('test-writer')).toEqual(['read', 'edit']);
    expect(bySlug.get('feature-builder')).toEqual(['read', 'edit', 'command']);
  });

  it('every mode carries slug, name, roleDefinition, groups; NO model/iconName/source', () => {
    const { readOnly, edit, full } = fixtures();
    const parsed = parseYaml(kiloEmitter([readOnly, edit, full], ctx).content) as {
      customModes: Record<string, unknown>[];
    };
    for (const mode of parsed.customModes) {
      expect(typeof mode.slug).toBe('string');
      expect(typeof mode.name).toBe('string');
      expect(typeof mode.roleDefinition).toBe('string');
      expect((mode.roleDefinition as string).length).toBeGreaterThan(0);
      expect(Array.isArray(mode.groups)).toBe(true);
      expect('model' in mode).toBe(false);
      expect('iconName' in mode).toBe(false);
      expect('source' in mode).toBe(false);
      expect('fileRegex' in mode).toBe(false);
      expect('version' in mode).toBe(false);
    }
  });

  it('snapshot', () => {
    const { readOnly, edit, full } = fixtures();
    expect(kiloEmitter([readOnly, edit, full], ctx).content).toMatchSnapshot();
  });

  it('round-trips at scale without YAML anchors/aliases (shared groups refs expanded)', () => {
    // Many same-tier agents share the same `groups` array reference; without alias suppression
    // the yaml lib emits anchors that trip the parser's alias-count safety limit. Assert a large
    // set both lacks `&`/`*` anchor syntax and re-parses cleanly.
    const many = Array.from({ length: 60 }, (_, i) =>
      buildAgent({
        name: `agent-${String(i).padStart(3, '0')}`,
        description: `Edit-tier agent number ${i} for round-trip scale testing of the emitter.`,
        permission: 'edit',
        tools: ['read', 'edit'],
      }),
    );
    const content = kiloEmitter(many, ctx).content;
    expect(content).not.toMatch(/:\s+&[A-Za-z0-9]/); // no anchor definitions
    expect(content).not.toMatch(/\*[A-Za-z0-9]+\s*$/m); // no alias references
    const parsed = parseYaml(content) as { customModes: unknown[] };
    expect(parsed.customModes).toHaveLength(60);
  });
});
