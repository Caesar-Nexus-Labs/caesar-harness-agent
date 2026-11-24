import { stringify as stringifyYaml } from 'yaml';
import type { CanonicalAgent } from '../../../loader/agent-file-loader.js';
import { getToolTargetMeta } from '../../../mapping/tool-targets.js';
import type { EmitContext, EmittedFile } from '../../core/emitter-interface.js';
import { useWhenLine } from '../fallback/agents-md-text.js';

// Qwen Code skill emitter: CanonicalAgent → `.qwen/skills/{slug}/SKILL.md`.
// Supports progressive-disclosure metadata plus optional lifecycle hooks from Schema v2.
// Pure (no I/O).

function buildQwenHooksBlock(
  hooks: NonNullable<CanonicalAgent['frontmatter']['hooks']>,
): Record<string, Array<{ matcher?: string; hooks: Array<{ type: 'command'; command: string }> }>> {
  const grouped: Record<
    string,
    Array<{ matcher?: string; hooks: Array<{ type: 'command'; command: string }> }>
  > = {};

  for (const h of hooks) {
    const list = grouped[h.event] ?? [];
    const entry: { matcher?: string; hooks: Array<{ type: 'command'; command: string }> } = {
      hooks: [{ type: 'command', command: h.command }],
    };
    if (h.matcher) {
      entry.matcher = h.matcher;
    }
    list.push(entry);
    grouped[h.event] = list;
  }

  return grouped;
}

export function qwenEmitter(agent: CanonicalAgent, _ctx: EmitContext): EmittedFile {
  const fm = agent.frontmatter;
  const frontmatter: Record<string, unknown> = {
    name: agent.slug,
    description: useWhenLine(agent),
  };

  if (fm.hooks && fm.hooks.length > 0) {
    frontmatter.hooks = buildQwenHooksBlock(fm.hooks);
  }

  const yaml = stringifyYaml(frontmatter, { lineWidth: 0 }).trimEnd();
  const body = agent.body.replace(/\r\n?/g, '\n').trim();
  const content = `---\n${yaml}\n---\n\n${body}\n`;
  const { outputSubdir } = getToolTargetMeta('qwen');

  return {
    tool: 'qwen',
    relativePath: `${outputSubdir}/${agent.slug}/SKILL.md`,
    content,
  };
}
