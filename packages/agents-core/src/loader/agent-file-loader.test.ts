import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AgentValidationError } from '../errors.js';
import { discoverAgents } from './agent-discovery.js';
import { parseAgentFile } from './agent-file-loader.js';

const VALID_AGENT = `---
name: valid-agent
description: A valid fixture agent used to verify the canonical schema and parser.
category: 01-core-development
model: balanced
permission: read-only
tools: [read, grep, glob]
---

## Role & Expertise
Senior fixture specialist.

## When to Use
When a valid agent is required by tests.

## Workflow
1. Be parsed.

## Checklist & Heuristics
- Has all six sections.

## Output Contract
Returns a CanonicalAgent.

## Boundaries
Test fixture only.
`;

let root: string;
let validPath: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'caesar-agents-'));
  const catDir = join(root, 'agents', '01-core-development');
  mkdirSync(catDir, { recursive: true });
  validPath = join(catDir, 'valid-agent.md');
  writeFileSync(validPath, VALID_AGENT, 'utf8');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('parseAgentFile', () => {
  it('parses a valid agent into a CanonicalAgent', () => {
    const agent = parseAgentFile(validPath);
    expect(agent.frontmatter.name).toBe('valid-agent');
    expect(agent.frontmatter.model).toBe('balanced');
    expect(agent.slug).toBe('valid-agent');
    expect(agent.body).toContain('## Boundaries');
  });

  it('throws when category does not match parent dir', () => {
    const wrongDir = join(root, 'agents', '02-language-specialists');
    mkdirSync(wrongDir, { recursive: true });
    const p = join(wrongDir, 'valid-agent.md');
    writeFileSync(p, VALID_AGENT, 'utf8'); // category says 01- but dir is 02-
    expect(() => parseAgentFile(p)).toThrow(AgentValidationError);
  });

  it('throws when filename does not match name', () => {
    const p = join(root, 'agents', '01-core-development', 'renamed.md');
    writeFileSync(p, VALID_AGENT, 'utf8'); // name says valid-agent but file is renamed
    expect(() => parseAgentFile(p)).toThrow(/does not match name/);
  });

  it('throws on missing body sections', () => {
    const p = join(root, 'agents', '01-core-development', 'partial.md');
    const partial = VALID_AGENT.replace('name: valid-agent', 'name: partial').replace(
      /## When to Use[\s\S]*$/,
      '',
    );
    writeFileSync(p, partial, 'utf8');
    expect(() => parseAgentFile(p)).toThrow(/missing body sections/);
  });

  it('throws AgentValidationError (not raw fs error) when file is missing', () => {
    const p = join(root, 'agents', '01-core-development', 'does-not-exist.md');
    expect(() => parseAgentFile(p)).toThrow(AgentValidationError);
    expect(() => parseAgentFile(p)).toThrow(/cannot read file/);
  });
});

describe('discoverAgents', () => {
  it('finds agent files under agents/NN-*/', () => {
    const found = discoverAgents(root);
    const slugs = found.map((f) => f.slug);
    expect(slugs).toContain('valid-agent');
    expect(found.every((f) => /^[0-9]{2}-/.test(f.category))).toBe(true);
  });

  it('ignores .gitkeep and _template', () => {
    writeFileSync(join(root, 'agents', '01-core-development', '.gitkeep'), '', 'utf8');
    const found = discoverAgents(root);
    expect(found.some((f) => f.slug === '.gitkeep')).toBe(false);
  });
});
