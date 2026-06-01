import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { discoverAgents, parseAgentFile } from '../index.js';

// Phase B/C depth gate (manifest-driven): every re-authored agent must land in the 150-220
// body-line band (hard absolute max 300), carry >=1 concrete artifact (fenced code block OR
// markdown table) where the domain warrants it, and must NOT drift its permission/model tier
// vs the recorded baseline (baseline-tiers.json). Structural ratchet — necessary-not-sufficient;
// real quality stays at G4 review.
//
// Rollout mechanics:
// - UPGRADED: slugs re-authored to the depth band. GROWS to all 134 as Phase C completes.
//   Only these get the band+artifact assertion; the rest are still ~90-line baselines.
// - LEAN_EXEMPT: slugs intentionally kept lean (simple/narrow) with justification — never
//   added to UPGRADED, never band-asserted.
// - Tier diff + hard-300 max run on ALL agents always (no silent permission/model drift).

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..');

// Agents re-authored to the depth band so far. Append per category until this covers all 134.
const UPGRADED: ReadonlySet<string> = new Set<string>([
  // Phase B pilots
  'react-specialist',
  'sre-engineer',
  'gdpr-ccpa-compliance',
  'nlp-engineer',
  'backend-developer',
  // Phase C — 01-core-development
  'api-designer',
  'frontend-developer',
  'fullstack-developer',
  'graphql-architect',
  'microservices-architect',
  'websocket-engineer',
  // Phase C — 10-research-analysis
  'data-researcher',
  'first-principles-thinking',
  'project-idea-validator',
  'research-analyst',
  'scientific-literature-researcher',
  'search-specialist',
  // Phase C — 08-business-product
  'assumption-mapping',
  'backlog-grooming',
  'business-analyst',
  'license-engineer',
  'product-manager',
  'project-manager',
  'scrum-master',
  'technical-writer',
  // Phase C — 09-meta-orchestration
  'agent-organizer',
  'codebase-orchestrator',
  'context-manager',
  'error-coordinator',
  'knowledge-synthesizer',
  'multi-agent-coordinator',
  'performance-monitor',
  'policy-guardrail-designer',
  'task-distributor',
  'workflow-orchestrator',
  // Phase C — 06-developer-experience
  'build-engineer',
  'cli-developer',
  'code-generator',
  'dependency-manager',
  'documentation-engineer',
  'dx-optimizer',
  'git-workflow-manager',
  'legacy-modernizer',
  'mcp-developer',
  'readme-generator',
  'refactoring-specialist',
  'tooling-engineer',
  // Phase C — 07-specialized-domains
  'api-documenter',
  'blockchain-developer',
  'embedded-systems',
  'fintech-engineer',
  'game-developer',
  'hipaa-compliance',
  'iot-engineer',
  'mobile-app-developer',
  'payment-integration',
  'quant-analyst',
  'risk-manager',
  // Phase C — 03-infrastructure
  'azure-infra-engineer',
  'backstage-specialist',
  'cloud-architect',
  'database-administrator',
  'deployment-engineer',
  'devops-engineer',
  'docker-expert',
  'golden-path-designer',
  'idp-architect',
  'incident-responder',
  'kubernetes-specialist',
  'network-engineer',
  'platform-engineer',
  'platform-product-manager',
  'security-engineer',
  'terraform-engineer',
  'terragrunt-expert',
  // Phase C — 04-quality-security
  'accessibility-tester',
  'ad-security-reviewer',
  'architect-reviewer',
  'chaos-engineer',
  'code-reviewer',
  'compliance-auditor',
  'debugger',
  'error-detective',
  'penetration-tester',
  'performance-engineer',
  'qa-expert',
  'security-auditor',
  'test-automator',
  'ui-ux-tester',
  // Phase C — 05-data-ai
  'ai-engineer',
  'ai-governance-auditor',
  'ai-observability-engineer',
  'data-analyst',
  'data-engineer',
  'data-scientist',
  'database-optimizer',
  'eval-engineer',
  'hallucination-investigator',
  'llm-architect',
  'ml-engineer',
  'mlops-engineer',
  'model-risk-manager',
  'postgres-pro',
  'prompt-engineer',
  'prompt-regression-tester',
  'reinforcement-learning-engineer',
  'responsible-ai-reviewer',
  // Phase C — 02-language-specialists
  'angular-architect',
  'cpp-pro',
  'csharp-developer',
  'django-developer',
  'dotnet-core-expert',
  'elixir-expert',
  'expo-react-native-expert',
  'fastapi-developer',
  'flutter-expert',
  'golang-pro',
  'java-architect',
  'javascript-pro',
  'kotlin-specialist',
  'laravel-specialist',
  'nextjs-developer',
  'node-specialist',
  'php-pro',
  'powershell-7-expert',
  'python-pro',
  'rails-expert',
  'rust-engineer',
  'spring-boot-engineer',
  'sql-pro',
  'swift-expert',
  'symfony-specialist',
  'typescript-pro',
  'vue-expert',
]);

// Agents intentionally kept lean (below band) with justification. Permanent exemption.
const LEAN_EXEMPT: ReadonlySet<string> = new Set<string>([]);

const BAND_MIN = 150;
const BAND_MAX = 220;
const HARD_MAX = 300;

interface BaselineTier {
  permission: string;
  model: string;
  category: string;
}

function baseline(): Record<string, BaselineTier> {
  const p = join(here, 'baseline-tiers.json');
  if (!existsSync(p))
    throw new Error('baseline-tiers.json missing — run scripts/snapshot-agent-tiers.ts');
  return JSON.parse(readFileSync(p, 'utf8'));
}

/** True if the body contains a fenced code block or a markdown table. */
function hasArtifact(body: string): boolean {
  const hasFence = /```[\s\S]*?```/.test(body);
  const hasTable = /^\s*\|.*\|\s*$/m.test(body) && /^\s*\|[\s:|-]+\|\s*$/m.test(body);
  return hasFence || hasTable;
}

const agents = discoverAgents(repoRoot).map((d) => parseAgentFile(d.path));
const baselineTiers = baseline();

describe('agent depth budget (Phase B/C ratchet)', () => {
  it('discovers all 134 agents', () => {
    expect(agents.length).toBe(134);
  });

  for (const agent of agents) {
    const slug = agent.frontmatter.name;
    const upgraded = UPGRADED.has(slug) && !LEAN_EXEMPT.has(slug);

    if (upgraded) {
      it(`is within the depth band [${BAND_MIN},${BAND_MAX}] (hard max ${HARD_MAX}): ${slug}`, () => {
        const lines = agent.body.split('\n').length;
        expect(lines).toBeGreaterThanOrEqual(BAND_MIN);
        expect(lines).toBeLessThanOrEqual(BAND_MAX);
      });

      it(`carries at least one concrete artifact (code block or table): ${slug}`, () => {
        expect(hasArtifact(agent.body)).toBe(true);
      });
    }
  }

  it('no agent body exceeds the hard 300-line max', () => {
    for (const agent of agents) {
      expect(
        agent.body.split('\n').length,
        `${agent.frontmatter.name} exceeds hard max`,
      ).toBeLessThanOrEqual(HARD_MAX);
    }
  });

  it('permission/model tiers match the recorded baseline (no silent drift)', () => {
    for (const agent of agents) {
      const slug = agent.frontmatter.name;
      const expected = baselineTiers[slug];
      expect(expected, `baseline missing for ${slug}`).toBeDefined();
      expect(agent.frontmatter.permission, `${slug} permission drift`).toBe(expected?.permission);
      expect(agent.frontmatter.model, `${slug} model drift`).toBe(expected?.model);
    }
  });
});
