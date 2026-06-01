import { describe, expect, it } from 'vitest';
import { CanonicalAgentFrontmatterSchema } from './canonical-agent-schema.js';

describe('CanonicalAgentFrontmatterSchema', () => {
  const base = {
    name: 'code-reviewer',
    description: 'Expert code review specialist for quality and security.',
    category: '04-quality-security',
    permission: 'read-only' as const,
    tools: ['read', 'grep', 'glob'],
  };

  it('parses a valid frontmatter and defaults model to inherit', () => {
    const result = CanonicalAgentFrontmatterSchema.parse(base);
    expect(result.name).toBe('code-reviewer');
    expect(result.model).toBe('inherit');
    expect(result.tools).toEqual(['read', 'grep', 'glob']);
  });

  it('rejects a non-kebab-case name', () => {
    const r = CanonicalAgentFrontmatterSchema.safeParse({ ...base, name: 'Code_Reviewer' });
    expect(r.success).toBe(false);
  });

  it('rejects a too-short description', () => {
    const r = CanonicalAgentFrontmatterSchema.safeParse({ ...base, description: 'short' });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid permission value', () => {
    const r = CanonicalAgentFrontmatterSchema.safeParse({ ...base, permission: 'superuser' });
    expect(r.success).toBe(false);
  });

  it('rejects read-only agent requesting a mutating tool (poka-yoke)', () => {
    const r = CanonicalAgentFrontmatterSchema.safeParse({
      ...base,
      permission: 'read-only',
      tools: ['read', 'write'],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message.includes('mutating tools'))).toBe(true);
    }
  });

  it('allows a full-permission agent to use mutating tools', () => {
    const r = CanonicalAgentFrontmatterSchema.safeParse({
      ...base,
      permission: 'full',
      tools: ['read', 'edit', 'write', 'bash'],
    });
    expect(r.success).toBe(true);
  });

  it('rejects an unknown tool value', () => {
    const r = CanonicalAgentFrontmatterSchema.safeParse({ ...base, tools: ['read', 'telepathy'] });
    expect(r.success).toBe(false);
  });

  it('rejects unknown frontmatter keys (strict)', () => {
    const r = CanonicalAgentFrontmatterSchema.safeParse({ ...base, unknownKey: true });
    expect(r.success).toBe(false);
  });
});
