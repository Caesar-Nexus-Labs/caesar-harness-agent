import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseAgentFile } from '../../../loader/agent-file-loader.js';
import {
  agentsMdOutputValidator,
  makeAgentsMdOutputValidator,
} from '../../../validation/agents-md-output-validator.js';
import { agentsMdEmitter } from './agents-md-emitter.js';
import type { EmitContext } from '../../core/emitter-interface.js';
import { buildAgent } from '../pilot/pilot-emitter-test-fixtures.js';

// Snapshot + invariant tests for the aggregate AGENTS.md emitter. The snapshot uses the REAL
// 7 cat-01 authored agents so it locks the actual routing index a user would receive.

const ctx: EmitContext = { distRoot: '/tmp/dist' };

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..', '..', '..');
const cat01Dir = join(repoRoot, 'agents', '01-core-development');

function cat01Agents() {
  if (!existsSync(cat01Dir)) return [];
  return readdirSync(cat01Dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parseAgentFile(join(cat01Dir, f)));
}

describe('agentsMdEmitter — real cat-01 agents', () => {
  const agents = cat01Agents();

  it('finds the 7 core-development pilot agents', () => {
    expect(agents.length).toBeGreaterThanOrEqual(7);
  });

  it('emits a single AGENTS.md routing index (snapshot)', () => {
    expect(agentsMdEmitter(agents, ctx).content).toMatchSnapshot();
  });

  it('writes to repo-root AGENTS.md', () => {
    const file = agentsMdEmitter(agents, ctx);
    expect(file.tool).toBe('agents-md');
    expect(file.relativePath).toBe('AGENTS.md');
  });

  it('contains a section for every authored agent + Platform Notes', () => {
    const content = agentsMdEmitter(agents, ctx).content;
    for (const a of agents) expect(content).toContain(`### ${a.slug}`);
    expect(content).toContain('## Platform Notes');
    expect(content).toContain('Roo: skipped');
  });

  it('frames Amp as a first-class native AGENTS.md reader with an experimental plugin path', () => {
    const content = agentsMdEmitter(agents, ctx).content;
    expect(content).toContain('Amp: reads AGENTS.md as first-class native config');
    expect(content).toMatch(/experimental.*TypeScript plugin|experimental.*createAgent/);
  });

  it('passes the coverage-aware output validator', () => {
    const content = agentsMdEmitter(agents, ctx).content;
    const validate = makeAgentsMdOutputValidator(agents.map((a) => a.slug));
    expect(validate(content)).toEqual({ ok: true, errors: [] });
  });
});

describe('agentsMdEmitter — grouping + determinism', () => {
  it('groups by category (NN asc) then agent name (asc); same input → identical output', () => {
    const agents = [
      buildAgent({ name: 'zebra', category: '02-language-specialists' }),
      buildAgent({ name: 'alpha', category: '01-core-development' }),
      buildAgent({ name: 'beta', category: '01-core-development' }),
    ];
    const out = agentsMdEmitter(agents, ctx).content;

    // categories ordered 01 before 02
    expect(out.indexOf('## 01-core-development')).toBeLessThan(
      out.indexOf('## 02-language-specialists'),
    );
    // within 01: alpha before beta
    expect(out.indexOf('### alpha')).toBeLessThan(out.indexOf('### beta'));
    // zebra under 02 comes after both
    expect(out.indexOf('### beta')).toBeLessThan(out.indexOf('### zebra'));

    expect(agentsMdEmitter(agents, ctx).content).toBe(out);
  });

  it('marks read-only agents and summarizes their tool surface', () => {
    const agent = buildAgent({ name: 'doc-reader', permission: 'read-only', tools: [] });
    const out = agentsMdEmitter([agent], ctx).content;
    expect(out).toContain('Read-only: yes.');
    expect(out).toContain('Tools: read, grep, glob.');
  });

  it('marks full-permission agents as not read-only with "all" tools when unrestricted', () => {
    const agent = buildAgent({ name: 'builder', permission: 'full', tools: [] });
    const out = agentsMdEmitter([agent], ctx).content;
    expect(out).toContain('Read-only: no.');
    expect(out).toContain('Tools: all.');
  });

  it('prefers when_to_use over description for the Use-when line', () => {
    const agent = buildAgent({
      name: 'tester',
      description: 'A description that should not be the routing line.',
      when_to_use: 'Invoke right after a feature lands to lock behavior with tests.',
    });
    const out = agentsMdEmitter([agent], ctx).content;
    expect(out).toContain('Use when: Invoke right after a feature lands');
  });
});

describe('agentsMdOutputValidator', () => {
  it('accepts a well-formed index', () => {
    const content = agentsMdEmitter([buildAgent()], ctx).content;
    expect(agentsMdOutputValidator(content).ok).toBe(true);
  });

  it('rejects content missing the index header', () => {
    const result = agentsMdOutputValidator('## Platform Notes\n### x\nUse when: y.');
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('Agent Routing Index');
  });

  it('rejects content missing Platform Notes', () => {
    const result = agentsMdOutputValidator('# Agent Routing Index\n### x\nUse when: y.');
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('Platform Notes');
  });

  it('rejects an agent section with no Use-when line', () => {
    const content = '# Agent Routing Index\n\n## 01-core\n\n### orphan\n\n## Platform Notes\n- x';
    const result = agentsMdOutputValidator(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('orphan');
  });

  it('coverage validator flags a missing agent section', () => {
    const content = agentsMdEmitter([buildAgent({ name: 'present' })], ctx).content;
    const validate = makeAgentsMdOutputValidator(['present', 'absent']);
    const result = validate(content);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('absent');
  });
});
