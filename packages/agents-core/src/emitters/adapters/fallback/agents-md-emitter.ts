import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { getToolTargetMeta } from '../../../mapping/tool-targets.js';
import { boundaryLine, toolsSummary, useWhenLine } from '../fallback/agents-md-text.js';
import type { AggregateEmitter, EmitContext, EmittedFile } from '../../core/emitter-interface.js';

// agents-md AGGREGATE emitter: ALL agents → one root `AGENTS.md` routing index.
// AGENTS.md is the universal fallback for tools without a native subagent format
// (Cursor, Windsurf, Cline, Antigravity, Amp, Kilo, OpenHands; OpenCode also reads it).
//
// Shape (deterministic — category number asc, then agent name asc):
//   # Agent Routing Index
//   > <intro>
//   ## NN-category
//   ### agent-name
//   Use when: <when_to_use|description>. Read-only: yes|no. Tools: <summary>.
//   Boundary: <first boundary line>            (omitted if the body has none)
//   ## Platform Notes
//   - <per-tool limitation lines>
//
// Pure (no I/O). Freeform markdown → structural invariants checked by the output validator.

/** Intro blurb naming the fallback consumers. */
const INTRO =
  'Fallback routing guide for tools without native subagents ' +
  '(Cursor, Windsurf, Cline, Antigravity, Amp, Kilo, OpenHands). OpenCode also reads this.';

/** Platform Notes — documents each fallback tool's known limitation (report §2,§3,§4). */
const PLATFORM_NOTES: readonly string[] = [
  'Cursor: Custom Modes were removed in v2.1 — this index is always-on guidance; ' +
    'enable per-agent `.cursor/rules/*.mdc` (opt-in) for on-demand activation.',
  'Windsurf: no native subagents — opt-in `.windsurf/rules/*.md` ' +
    '(trigger: model_decision, ≤12k chars/file) gives the closest on-demand behavior.',
  'Cline: no native subagents — opt-in `.clinerules/NN-*.md` rules bank; this index is the default.',
  'Antigravity: reads AGENTS.md (cross-tool) and GEMINI.md; no confirmed native subagent file ' +
    '(use `--tool gemini` for native `.gemini/agents` if running Gemini CLI).',
  'Amp: reads AGENTS.md as first-class native config (cwd + parent dirs to $HOME + lazy ' +
    'subtree; fallback AGENT.md/CLAUDE.md). No per-subagent drop-in format; the only custom-agent ' +
    'path is an experimental, unstable TypeScript plugin (`.amp/plugins/*.ts` via ' +
    '`experimental.createAgent`) — deferred/opt-in.',
  'Kilo: native `.kilocodemodes` (use `--tool kilo`); also auto-delegates via this AGENTS.md.',
  'OpenHands: native `.agents/skills/{slug}/SKILL.md` (use `--tool openhands`); the SDK also ' +
    'reads AGENTS.md (always-on).',
  'Roo: skipped (sunset 2026-05-15, repo archived).',
];

/** Group agents by category, returning `[category, agents]` sorted by category then name. */
function groupByCategory(agents: readonly CanonicalAgent[]): [string, CanonicalAgent[]][] {
  const byCat = new Map<string, CanonicalAgent[]>();
  for (const a of agents) {
    const list = byCat.get(a.frontmatter.category) ?? [];
    list.push(a);
    byCat.set(a.frontmatter.category, list);
  }
  return [...byCat.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, list]) => [cat, list.sort((x, y) => x.slug.localeCompare(y.slug))]);
}

/** Render one agent's compact routing entry (### name + Use when / permission / boundary). */
function renderAgent(agent: CanonicalAgent): string {
  const fm = agent.frontmatter;
  const readOnly = fm.permission === 'read-only' ? 'yes' : 'no';
  const lines = [
    `### ${fm.name}`,
    `Use when: ${useWhenLine(agent)} Read-only: ${readOnly}. ` +
      `Tools: ${toolsSummary(fm.tools, fm.permission)}.`,
  ];
  const boundary = boundaryLine(agent.body);
  if (boundary !== undefined) lines.push(`Boundary: ${boundary}`);
  return lines.join('\n');
}

export const agentsMdEmitter: AggregateEmitter = (
  agents: readonly CanonicalAgent[],
  _ctx: EmitContext,
): EmittedFile => {
  const sections: string[] = ['# Agent Routing Index', `> ${INTRO}`];

  for (const [category, list] of groupByCategory(agents)) {
    sections.push(`## ${category}`);
    for (const agent of list) sections.push(renderAgent(agent));
  }

  sections.push('## Platform Notes');
  sections.push(PLATFORM_NOTES.map((n) => `- ${n}`).join('\n'));

  const content = `${sections.join('\n\n')}\n`;
  const { outputSubdir } = getToolTargetMeta('agents-md');
  const relativePath = outputSubdir ? `${outputSubdir}/AGENTS.md` : 'AGENTS.md';

  return { tool: 'agents-md', relativePath, content };
};
