// Blind pairwise judge for the pilot depth eval (Phase B, condition 1).
//
// Uses the local `claude -p` CLI as an OUT-OF-CONTEXT judge: it receives only a task + two
// label-stripped candidate PROMPT bodies (hash ids, no A/B/C, no authoring history) and must
// pick which prompt would better equip an agent to accomplish the task. This is more
// independent than inline self-judging (fresh process, no conversation context) but is still
// the same model FAMILY — so we add the red-team mitigations:
//   - blind: candidates shown as "Prompt 1 / Prompt 2", real identity hashed
//   - position-swap: each pair judged in BOTH orders; a win counts only if the SAME candidate
//     wins both orders (flips => "no decision", conservative)
//   - task-only rubric: judge told to score task-fitness and ignore length/verbosity/formatting
//
// We judge prompt QUALITY for the task (not generated outputs) to keep the run bounded and
// deterministic-ish. Reports B-vs-A and B-vs-C win/tie/loss per agent.
//
// Run: tsx scripts/pilot-depth-blind-judge.ts   (requires `claude` on PATH)

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const planDir = join(repoRoot, 'plans', '260530-1741-agent-capability-depth-upgrade');
const bundlesDir = join(planDir, 'eval', 'blind-bundles');
const evalDir = join(planDir, 'eval');

interface Bundle {
  slug: string;
  tasks: string[];
  keymap: Record<string, string>; // hashId -> A|B|C
}

function loadBundles(): Bundle[] {
  const out: Bundle[] = [];
  for (const f of readdirSync(bundlesDir)) {
    if (!f.endsWith('.tasks.json')) continue;
    const data = JSON.parse(readFileSync(join(bundlesDir, f), 'utf8'));
    out.push(data);
  }
  return out;
}

function promptBodyFor(slug: string, hashId: string): string {
  return readFileSync(join(bundlesDir, `${slug}.${hashId}.prompt.md`), 'utf8');
}

function hashForVariant(keymap: Record<string, string>, variant: string): string {
  const entry = Object.entries(keymap).find(([, v]) => v === variant);
  if (!entry) throw new Error(`variant ${variant} not in keymap`);
  return entry[0];
}

/** Ask the out-of-context judge which prompt better fits the task. Returns 1 or 2 or 0 (tie). */
function judge(task: string, prompt1: string, prompt2: string): number {
  const instruction = [
    'You are evaluating two candidate SYSTEM PROMPTS for an AI coding subagent.',
    'Pick which prompt would better equip the agent to accomplish the TASK below.',
    'Judge ONLY task-fitness: concrete guidance, correct decisions, useful boundaries.',
    'IGNORE length, verbosity, and formatting flourish — a longer prompt is not better by default.',
    'Answer with exactly one token: "1", "2", or "TIE". No explanation.',
    '',
    `TASK: ${task}`,
    '',
    '--- PROMPT 1 ---',
    prompt1,
    '--- END PROMPT 1 ---',
    '',
    '--- PROMPT 2 ---',
    prompt2,
    '--- END PROMPT 2 ---',
    '',
    'Answer (1 / 2 / TIE):',
  ].join('\n');
  try {
    const tmp = join(tmpdir(), `judge_${Math.random().toString(36).slice(2)}.txt`);
    writeFileSync(tmp, instruction, 'utf8');
    const out = execSync(`claude -p < "${tmp}"`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000,
    }).trim();
    if (/\b1\b/.test(out) && !/\b2\b/.test(out)) return 1;
    if (/\b2\b/.test(out) && !/\b1\b/.test(out)) return 2;
    return 0;
  } catch (e) {
    console.error('judge error:', e instanceof Error ? e.message : String(e));
    return 0;
  }
}

/** Position-swap consistent pairwise: returns 'left' | 'right' | 'nodecision'. */
function pairwise(task: string, left: string, right: string): 'left' | 'right' | 'nodecision' {
  const order1 = judge(task, left, right); // left=1, right=2
  const order2 = judge(task, right, left); // right=1, left=2
  // left wins iff judge picks left in BOTH orders.
  const leftWinsO1 = order1 === 1;
  const leftWinsO2 = order2 === 2;
  const rightWinsO1 = order1 === 2;
  const rightWinsO2 = order2 === 1;
  if (leftWinsO1 && leftWinsO2) return 'left';
  if (rightWinsO1 && rightWinsO2) return 'right';
  return 'nodecision';
}

function main(): void {
  if (!existsSync(bundlesDir)) {
    console.error('No blind bundles — run pilot-depth-eval-runner.ts first.');
    process.exit(1);
  }
  const bundles = loadBundles();
  const results: Record<string, unknown> = { judgedAt: new Date().toISOString(), model: 'claude -p (same-family, out-of-context, blind, position-swapped)', agents: {} };
  const agentsOut = results.agents as Record<string, unknown>;

  const summary: string[] = [];
  summary.push('| agent | B vs A (win/tie/loss) | B vs C (win/tie/loss) |');
  summary.push('|-------|----------------------|----------------------|');

  for (const b of bundles) {
    const hA = hashForVariant(b.keymap, 'A');
    const hB = hashForVariant(b.keymap, 'B');
    const hC = hashForVariant(b.keymap, 'C');
    const pA = promptBodyFor(b.slug, hA);
    const pB = promptBodyFor(b.slug, hB);
    const pC = promptBodyFor(b.slug, hC);

    let bWinA = 0, bTieA = 0, bLossA = 0;
    let bWinC = 0, bTieC = 0, bLossC = 0;
    for (const task of b.tasks) {
      const ra = pairwise(task, pB, pA); // left=B, right=A
      if (ra === 'left') bWinA++; else if (ra === 'right') bLossA++; else bTieA++;
      const rc = pairwise(task, pB, pC); // left=B, right=C(filler)
      if (rc === 'left') bWinC++; else if (rc === 'right') bLossC++; else bTieC++;
    }
    agentsOut[b.slug] = { bVsA: { win: bWinA, tie: bTieA, loss: bLossA }, bVsC: { win: bWinC, tie: bTieC, loss: bLossC } };
    summary.push(`| ${b.slug} | ${bWinA}/${bTieA}/${bLossA} | ${bWinC}/${bTieC}/${bLossC} |`);
    console.log(`${b.slug}: B-vs-A ${bWinA}/${bTieA}/${bLossA}  B-vs-C ${bWinC}/${bTieC}/${bLossC}`);
  }

  writeFileSync(join(evalDir, 'blind-judge-results.json'), JSON.stringify(results, null, 2), 'utf8');
  writeFileSync(join(evalDir, 'blind-judge-summary.md'), summary.join('\n'), 'utf8');
  console.log(`\nResults: ${join(evalDir, 'blind-judge-results.json')}`);
  console.log(summary.join('\n'));
}

main();
