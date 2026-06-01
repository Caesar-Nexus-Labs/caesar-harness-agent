// Pilot depth-evaluation harness.
//
// Purpose: provide a REAL, runnable comparison of three prompt variants per pilot agent —
//   A = baseline (~90-line, pre-upgrade, from an ignored baseline bundle)
//   B = re-authored (current agents/ file, 150-220 line depth band)
//   C = filler-padded baseline (length-control: A padded to B's length with low-signal text)
//
// It does two things:
//   1. OBJECTIVE signal metrics (no LLM judge needed) — these legitimately discriminate
//      genuine depth (B) from mere length (C) and from the baseline (A): artifact count,
//      decision-signal density, unique-imperative density, filler ratio. A judge cannot be
//      gamed here; these are counted from the text.
//   2. BLIND TASK-SUCCESS scaffold — emits randomized, label-stripped variant bundles +
//      per-agent held-out task sets to an ignored eval bundle for an INDEPENDENT judge
//      (ideally a different model family) to score pairwise. The harness never scores its own
//      authored content as the dispositive judge (that would be circular + unblinded).
//
// Run: tsx scripts/pilot-depth-eval-runner.ts
// Output: prints the objective metric table + writes blind bundles + a machine-readable
//         metrics JSON. It does NOT fabricate judged win-rates.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const planDir = join(repoRoot, 'plans', '260530-1741-agent-capability-depth-upgrade');
const baselineDir = join(planDir, 'baseline');
const evalDir = join(planDir, 'eval');
const bundlesDir = join(evalDir, 'blind-bundles');

interface Pilot {
  slug: string;
  category: string;
  /** Held-out, domain-representative task prompts (em-generated; Anh reviews before judging). */
  tasks: string[];
}

const PILOTS: Pilot[] = [
  {
    slug: 'react-specialist',
    category: '02-language-specialists',
    tasks: [
      'A list re-renders the entire tree on every keystroke in the filter box. Diagnose the real cause and fix it without blanket React.memo.',
      'A useEffect logs a stale count value. Explain the closure and fix the dependency array correctly.',
      'Make a like button update optimistically and roll back if the server call fails.',
      'A third-party store is read directly in render and tears under concurrent updates. Fix it.',
      'Decide the Server vs Client Component boundary for a product page with an interactive add-to-cart widget.',
    ],
  },
  {
    slug: 'sre-engineer',
    category: '03-infrastructure',
    tasks: [
      'A checkout service has no reliability targets and pages constantly. Define SLIs/SLOs and fix the alerting.',
      'Set up burn-rate alerting on a 99.9% availability SLO so paging only happens when the budget is genuinely at risk.',
      'A low-traffic internal service trips absurd burn-rate alerts on single errors. Make its alerting trustworthy.',
      'On-call is drowning in CPU and host-up alerts. Cut the noise to actionable pages only.',
      'Turn a recurring outage into a blameless postmortem with durable guardrails.',
    ],
  },
  {
    slug: 'gdpr-ccpa-compliance',
    category: '04-quality-security',
    tasks: [
      'Review a signup + analytics data-collection flow for GDPR lawful basis and data minimization.',
      'Check a California app deletion and Do-Not-Sell-or-Share flow and whether Global Privacy Control is honored.',
      'Assess whether a documented DSAR/erasure process actually deletes across backups, logs, and processors.',
      'Determine whether a new ML profiling feature triggers a DPIA and what evidence to look for.',
      'Validate the cross-border transfer mechanism for EU user data sent to a US processor.',
    ],
  },
  {
    slug: 'nlp-engineer',
    category: '05-data-ai',
    tasks: [
      'A support team needs to auto-route tickets into 40 categories at high volume; an LLM per ticket is too slow/expensive. Choose and justify an approach.',
      'Train a NER model to extract drug, dosage, and frequency spans with correct span-level F1.',
      'Build semantic search where keyword search misses similar docs; include re-ranking.',
      'Classification accuracy looks high but the minority class is failing. Diagnose the metric and fix.',
      'Tokenization is misaligning labels in token classification. Explain and fix.',
    ],
  },
  {
    slug: 'backend-developer',
    category: '01-core-development',
    tasks: [
      'Implement POST /orders against an existing REST contract with validation, persistence, and tests.',
      'A payment webhook double-charges on retry. Add idempotency to the handler.',
      'Add object-level authorization to an endpoint that takes a user-supplied resource id.',
      'A multi-write operation leaves partial state on failure. Make it transactional.',
      'A list endpoint is slow and unbounded. Add correct pagination and indexing.',
    ],
  },
];

const FILLER_SENTENCES = [
  'It is important to follow best practices and industry standards at all times.',
  'Quality and maintainability are key considerations for any professional engineer.',
  'Always strive to write clean, readable, and well-documented code where possible.',
  'Remember that good communication and collaboration improve project outcomes.',
  'Consider the broader context and long-term implications of every decision made.',
  'Thorough testing and validation help ensure a reliable and robust solution overall.',
];

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

/** Strip YAML frontmatter, return the body. */
function body(md: string): string {
  const m = /^---\n[\s\S]*?\n---\n?([\s\S]*)$/.exec(md);
  return (m?.[1] ?? md).trim();
}

interface Metrics {
  bodyLines: number;
  artifacts: number; // fenced code blocks + markdown tables
  decisionSignals: number; // arrows, "defer to", "vs", thresholds, "not"
  uniqueBullets: number;
  fillerRatio: number; // share of sentences that look like generic filler
}

function countArtifacts(b: string): number {
  const fences = (b.match(/```[\s\S]*?```/g) ?? []).length;
  const tableSeparators = (b.match(/^\s*\|[\s:|-]+\|\s*$/gm) ?? []).length;
  return fences + tableSeparators;
}

function countDecisionSignals(b: string): number {
  // Concrete decision markers: routing arrows, deferrals, comparisons, numeric thresholds.
  const arrows = (b.match(/→|->/g) ?? []).length;
  const defers = (b.match(/defer to|→ \*\*|prefer|never|don't|do not/gi) ?? []).length;
  const numbers = (b.match(/\b\d+(\.\d+)?\s*(ms|s|%|×|x|h|m|d|k|MB|GB|hours|days)\b/gi) ?? []).length;
  return arrows + defers + numbers;
}

function uniqueBullets(b: string): number {
  const bullets = (b.match(/^\s*[-*]\s+.+$/gm) ?? []).map((l) => l.trim().toLowerCase());
  return new Set(bullets).size;
}

function fillerRatio(b: string): number {
  const sentences = b
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
  if (sentences.length === 0) return 0;
  const vague = sentences.filter((s) =>
    /\b(best practices|industry standards|clean, readable|where possible|in general|it is important|strive to|good communication|broader context)\b/i.test(
      s,
    ),
  ).length;
  return Number((vague / sentences.length).toFixed(3));
}

function metrics(b: string): Metrics {
  return {
    bodyLines: b.split('\n').length,
    artifacts: countArtifacts(b),
    decisionSignals: countDecisionSignals(b),
    uniqueBullets: uniqueBullets(b),
    fillerRatio: fillerRatio(b),
  };
}

/** Build the filler-padded length-control variant: baseline body + filler to ~match target lines. */
function makeFiller(baselineBody: string, targetLines: number): string {
  const lines = baselineBody.split('\n');
  let i = 0;
  while (lines.length < targetLines) {
    lines.push(FILLER_SENTENCES[i % FILLER_SENTENCES.length] ?? 'Additional consideration.');
    i++;
  }
  return lines.join('\n');
}

/** Build the negative control: baseline padded to band with filler + a junk 2-row table + junk fence. */
function makeNegativeControl(baselineBody: string, targetLines: number): string {
  const padded = makeFiller(baselineBody, targetLines - 8);
  const junkTable = '\n| Item | Note |\n| --- | --- |\n| Thing | Stuff |\n| Other | More |\n';
  const junkFence = '\n```text\nexample placeholder\n```\n';
  return padded + junkTable + junkFence;
}

function blindId(slug: string, variant: string): string {
  return createHash('sha256').update(`${slug}:${variant}:depth-eval`).digest('hex').slice(0, 12);
}

function main(): void {
  mkdirSync(bundlesDir, { recursive: true });
  const report: Record<string, unknown> = { generatedAt: new Date().toISOString(), pilots: {} };
  const pilotsOut = report.pilots as Record<string, unknown>;

  const rows: string[] = [];
  rows.push('| agent | variant | bodyLines | artifacts | decisionSignals | uniqueBullets | fillerRatio |');
  rows.push('|-------|---------|-----------|-----------|-----------------|---------------|-------------|');

  for (const pilot of PILOTS) {
    const currentPath = join(repoRoot, 'agents', pilot.category, `${pilot.slug}.md`);
    const baselinePath = join(baselineDir, `${pilot.slug}.md`);
    if (!existsSync(currentPath) || !existsSync(baselinePath)) {
      console.error(`SKIP ${pilot.slug}: missing current or baseline file`);
      continue;
    }
    const bBody = body(read(currentPath)); // re-authored
    const aBody = body(read(baselinePath)); // baseline
    const target = bBody.split('\n').length;
    const cBody = makeFiller(aBody, target); // length-control
    const negBody = makeNegativeControl(aBody, target); // negative control

    const mA = metrics(aBody);
    const mB = metrics(bBody);
    const mC = metrics(cBody);
    const mNeg = metrics(negBody);

    for (const [variant, m] of [
      ['A-baseline', mA],
      ['B-reauthored', mB],
      ['C-filler', mC],
      ['NEG-control', mNeg],
    ] as const) {
      rows.push(
        `| ${pilot.slug} | ${variant} | ${m.bodyLines} | ${m.artifacts} | ${m.decisionSignals} | ${m.uniqueBullets} | ${m.fillerRatio} |`,
      );
    }

    // Emit blind bundles for an independent judge (label-stripped, hashed ids, randomized order).
    const variants = [
      { tag: 'A', body: aBody },
      { tag: 'B', body: bBody },
      { tag: 'C', body: cBody },
    ];
    // Deterministic shuffle by hash so the run is reproducible but order is not A/B/C.
    const shuffled = [...variants].sort((x, y) =>
      blindId(pilot.slug, x.tag).localeCompare(blindId(pilot.slug, y.tag)),
    );
    const keymap: Record<string, string> = {};
    for (const v of shuffled) {
      const id = blindId(pilot.slug, v.tag);
      keymap[id] = v.tag;
      writeFileSync(join(bundlesDir, `${pilot.slug}.${id}.prompt.md`), v.body, 'utf8');
    }
    writeFileSync(
      join(bundlesDir, `${pilot.slug}.tasks.json`),
      JSON.stringify({ slug: pilot.slug, tasks: pilot.tasks, keymap }, null, 2),
      'utf8',
    );

    pilotsOut[pilot.slug] = {
      metrics: { A: mA, B: mB, C: mC, NEG: mNeg },
      // Objective gate signals (no judge): does depth (B) beat filler (C) on signal density?
      depthBeatsFillerOnArtifacts: mB.artifacts > mC.artifacts,
      depthBeatsFillerOnDecisionSignals: mB.decisionSignals > mC.decisionSignals,
      depthLowerFillerThanControl: mB.fillerRatio < mC.fillerRatio,
      negControlDetectable: mB.decisionSignals > mNeg.decisionSignals && mB.fillerRatio < mNeg.fillerRatio,
    };
  }

  writeFileSync(join(evalDir, 'objective-metrics.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(rows.join('\n'));
  console.log(`\nBlind bundles + task sets written to: ${bundlesDir}`);
  console.log(`Objective metrics JSON: ${join(evalDir, 'objective-metrics.json')}`);
  console.log(
    '\nNOTE: blind pairwise task-success scoring requires an INDEPENDENT judge (ideally a',
  );
  console.log(
    'different model family). The harness does not self-score its own authored content.',
  );
}

main();
