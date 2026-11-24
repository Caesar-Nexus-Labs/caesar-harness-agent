import { describe, expect, it } from 'vitest';
import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { agentSkillsOutputValidator } from '../../../validation/agent-skills-output-validator.js';
import { cursorOutputValidator } from '../../../validation/cursor-output-validator.js';
import { qoderOutputValidator } from '../../../validation/qoder-output-validator.js';
import { qwenOutputValidator } from '../../../validation/qwen-output-validator.js';
import { cursorAgentEmitter } from '../cursor/cursor-agent-emitter.js';
import { geminiExtensionEmitter } from '../gemini/gemini-extension.js';
import { qoderEmitter } from '../qoder/qoder-emitter.js';
import { qwenEmitter } from '../qwen/qwen-emitter.js';
import { qwenExtensionEmitter } from '../qwen/qwen-extension.js';
import { agentSkillsEmitter } from './agent-skills-emitter.js';

const sampleAgent: CanonicalAgent = {
  slug: 'rust-engineer',
  category: '02-language-specialists',
  sourcePath: 'agents/02-language-specialists/rust-engineer.md',
  frontmatter: {
    name: 'rust-engineer',
    description:
      'Expert Rust systems engineer. Use proactively when writing or auditing Rust crates.',
    category: '02-language-specialists',
    model: 'inherit',
    permission: 'read-only',
    tools: ['read', 'grep', 'glob'],
    color: 'orange',
    reasoning_effort: 'high',
    when_to_use: 'Use when designing or auditing Rust code.',
    kind: 'hybrid',
    isolation: 'background',
    invocation: {
      disable_model_invocation: false,
      user_invocable: true,
    },
    mcp_servers: ['context7'],
    hooks: [
      {
        event: 'PreToolUse',
        matcher: 'run_shell_command',
        command: 'cargo check --workspace',
      },
    ],
  },
  body: '## Role & Expertise\n\nSenior Rust engineer.\n',
};

const ctx = { targetVersion: '0.1.0' };

describe('Wave 1 emitters & validators', () => {
  it('emits valid Cursor native subagent (.cursor/agents/{slug}.md)', () => {
    const out = cursorAgentEmitter(sampleAgent, ctx);
    expect(out.tool).toBe('cursor');
    expect(out.relativePath).toBe('.cursor/agents/rust-engineer.md');
    expect(out.content).toContain('readonly: true');
    expect(out.content).toContain('is_background: true');
    expect(cursorOutputValidator(out.content).ok).toBe(true);
  });

  it('emits valid Universal Agent Skill (.agents/skills/{slug}/SKILL.md)', () => {
    const out = agentSkillsEmitter(sampleAgent, ctx);
    expect(out.tool).toBe('agent-skills');
    expect(out.relativePath).toBe('.agents/skills/rust-engineer/SKILL.md');
    expect(out.content).toContain('user-invocable: true');
    expect(agentSkillsOutputValidator(out.content).ok).toBe(true);
  });

  it('emits valid Qoder native subagent (.qoder/agents/{slug}.md)', () => {
    const out = qoderEmitter(sampleAgent, ctx);
    expect(out.tool).toBe('qoder');
    expect(out.relativePath).toBe('.qoder/agents/rust-engineer.md');
    expect(out.content).toContain('permissionMode: plan');
    expect(out.content).toContain('effort: high');
    expect(out.content).toContain('context7');
    expect(qoderOutputValidator(out.content).ok).toBe(true);
  });

  it('emits valid Qwen Code skill with hooks (.qwen/skills/{slug}/SKILL.md)', () => {
    const out = qwenEmitter(sampleAgent, ctx);
    expect(out.tool).toBe('qwen');
    expect(out.relativePath).toBe('.qwen/skills/rust-engineer/SKILL.md');
    expect(out.content).toContain('PreToolUse:');
    expect(out.content).toContain('cargo check --workspace');
    expect(qwenOutputValidator(out.content).ok).toBe(true);
  });

  it('emits valid Qwen and Gemini extension manifests', () => {
    const qwenExt = qwenExtensionEmitter([sampleAgent], ctx);
    expect(Array.isArray(qwenExt)).toBe(false);
    if (!Array.isArray(qwenExt)) {
      expect(qwenExt.relativePath).toBe('qwen-extension.json');
      const parsed = JSON.parse(qwenExt.content) as { skills: string[] };
      expect(parsed.skills).toEqual(['.qwen/skills/rust-engineer/SKILL.md']);
    }

    const geminiExt = geminiExtensionEmitter([sampleAgent], ctx);
    expect(Array.isArray(geminiExt)).toBe(false);
    if (!Array.isArray(geminiExt)) {
      expect(geminiExt.relativePath).toBe('gemini-extension.json');
      const parsed = JSON.parse(geminiExt.content) as { agentCount: number; agentsDir: string };
      expect(parsed.agentCount).toBe(1);
      expect(parsed.agentsDir).toBe('.gemini/agents');
    }
  });
});
