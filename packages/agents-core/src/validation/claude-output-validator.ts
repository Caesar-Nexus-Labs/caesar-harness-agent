import matter from 'gray-matter';
import { z } from 'zod';
import {
  type OutputValidator,
  validationFailed,
  validationOk,
} from './output-validator-interface.js';

// Output validator for emitted `.claude/agents/*.md`. Parses the EMITTED frontmatter back
// and zod-checks its shape/enums (G5 — catches transpiler drift before write).
//
// SECURITY (standards §2): read-only is enforced STRUCTURALLY. A read-only agent maps to
// permissionMode `plan` AND must never list a write/bash tool — this validator asserts both,
// so a regression that leaks Edit/Write/Bash into a read-only agent fails the build.

/** Claude write/execute tool ids that a read-only agent must never expose. */
const CLAUDE_MUTATING_TOOL_IDS: ReadonlySet<string> = new Set(['Edit', 'Write', 'Bash']);

const ClaudeFrontmatterSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'name must be lowercase kebab-case'),
    description: z.string().min(1, 'description must be non-empty'),
    tools: z.string().optional(),
    model: z.enum(['inherit', 'haiku', 'sonnet', 'opus']),
    permissionMode: z.enum(['plan', 'acceptEdits', 'default']),
    color: z.string().optional(),
  })
  .strict();

/** Parse a CSV tools string into trimmed ids; empty/undefined → []. */
function parseToolsCsv(tools: string | undefined): string[] {
  if (!tools) return [];
  return tools
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export const claudeOutputValidator: OutputValidator = (content: string) => {
  let data: unknown;
  try {
    data = matter(content).data;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return validationFailed([`failed to parse Claude frontmatter: ${reason}`]);
  }

  const parsed = ClaudeFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailed(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }

  const fm = parsed.data;
  const errors: string[] = [];

  // read-only ⇒ permissionMode `plan` AND no mutating tools in the allowlist.
  if (fm.permissionMode === 'plan') {
    const offenders = parseToolsCsv(fm.tools).filter((id) => CLAUDE_MUTATING_TOOL_IDS.has(id));
    if (offenders.length > 0) {
      errors.push(
        `read-only (permissionMode: plan) agent exposes mutating tools: ${offenders.join(', ')}`,
      );
    }
  }

  return errors.length > 0 ? validationFailed(errors) : validationOk();
};
