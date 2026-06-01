import type { CanonicalAgent } from '../loader/agent-file-loader.js';
import type { CanonicalAgentFrontmatter } from '../schema/canonical-agent-schema.js';

// Shared in-test fixtures for emitter/smoke tests. Built in memory (no disk dependency).
// Body carries the 6 mandatory sections in canonical order so smoke + body validation pass.

/** A prompt body with all 6 required sections in order. */
export const SIX_SECTION_BODY = [
  '## Role & Expertise',
  'You are an expert code reviewer.',
  '',
  '## When to Use',
  'After code is written or modified.',
  '',
  '## Workflow',
  '1. Read the diff. 2. Flag issues. 3. Report.',
  '',
  '## Checklist & Heuristics',
  '- Correctness before style.',
  '',
  '## Output Contract',
  'A prioritized list of findings.',
  '',
  '## Boundaries',
  'Never modify code; review only.',
].join('\n');

/** Build a CanonicalAgent fixture; override frontmatter/body per test. */
export function buildAgent(
  fm: Partial<CanonicalAgentFrontmatter> = {},
  body = SIX_SECTION_BODY,
): CanonicalAgent {
  const frontmatter: CanonicalAgentFrontmatter = {
    name: 'code-reviewer',
    description: 'Expert code review specialist for quality, security, and maintainability.',
    category: '01-core-development',
    model: 'balanced',
    permission: 'read-only',
    tools: ['read', 'grep', 'glob'],
    ...fm,
  };
  return {
    frontmatter,
    body,
    slug: frontmatter.name,
    path: `/agents/${frontmatter.category}/${frontmatter.name}.md`,
    bodyWarnings: [],
  };
}

/** read-only agent (no explicit tools → emitter applies read-only triad default). */
export function readOnlyAgent(): CanonicalAgent {
  return buildAgent({
    name: 'doc-reader',
    description: 'Reads and summarizes documentation without making changes.',
    permission: 'read-only',
    tools: [],
    model: 'inherit',
  });
}

/** full-permission agent with write/bash tools + a color. */
export function fullPermissionAgent(): CanonicalAgent {
  return buildAgent({
    name: 'feature-builder',
    description: 'Implements features end-to-end across the codebase with full tooling.',
    permission: 'full',
    tools: ['read', 'grep', 'glob', 'edit', 'write', 'bash'],
    model: 'top',
    color: 'green',
  });
}

/** edit-tier agent carrying when_to_use + examples (exercises Claude description folding). */
export function agentWithWhenToUseAndExamples(): CanonicalAgent {
  return buildAgent({
    name: 'test-writer',
    description: 'Writes and maintains automated tests for new and changed code.',
    permission: 'edit',
    tools: ['read', 'grep', 'glob', 'edit', 'write'],
    model: 'balanced',
    when_to_use: 'Invoke after a feature lands but before merge to lock behavior with tests.',
    examples: [
      { context: 'New endpoint added', trigger: 'add tests for the /users endpoint' },
      { context: 'Bug fixed', trigger: 'write a regression test for the null-pointer fix' },
    ],
  });
}

/** edit-tier agent with a reasoning_effort hint (exercises Codex/Factory reasoning mapping). */
export function agentWithReasoningEffort(): CanonicalAgent {
  return buildAgent({
    name: 'api-designer',
    description: 'API contract and specification design specialist for REST and GraphQL surfaces.',
    permission: 'edit',
    tools: ['read', 'grep', 'glob', 'edit', 'write'],
    model: 'top',
    reasoning_effort: 'high',
    color: 'blue',
  });
}
