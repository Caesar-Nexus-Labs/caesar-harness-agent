import matter from 'gray-matter';
import { z } from 'zod';
import {
  type OutputValidator,
  validationFailed,
  validationOk,
} from './output-validator-interface.js';

// Output validator for emitted `.github/agents/*.agent.md`. Parses the EMITTED frontmatter back
// and zod-checks its shape (G5).
//
// CONTRACT (spec §): the Copilot emitter OMITS `target` (defaults to both envs) and `handoffs`
// (VS Code-only, no inter-agent wiring authored in v1). `.strict()` + an explicit check assert
// neither key leaked in.
//
// SECURITY (standards §2): Copilot has no permission field — the `tools` array is the access
// surface. We assert every listed tool is one of the documented GitHub.com aliases; a read-only
// agent is restricted to read/search by the emitter (mapTools read-only default), so a mutating
// alias (edit/execute) can never appear for a read-only agent.

/** Documented GitHub.com Copilot custom-agent tool aliases (verified 2026-05-30). */
const COPILOT_TOOL_ALIASES: ReadonlySet<string> = new Set([
  'read',
  'search',
  'edit',
  'execute',
  'web',
  'agent',
  'todo',
]);

const CopilotFrontmatterSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'name must be lowercase kebab-case'),
    description: z.string().min(1, 'description must be non-empty'),
    tools: z.array(z.string()).optional(),
    model: z.string().min(1).optional(),
  })
  .strict(); // .strict() → a leaked `target`/`handoffs` key fails validation.

export const copilotOutputValidator: OutputValidator = (content: string) => {
  let data: unknown;
  try {
    data = matter(content).data;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return validationFailed([`failed to parse Copilot frontmatter: ${reason}`]);
  }

  const parsed = CopilotFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailed(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }

  const errors: string[] = [];

  // Explicit, friendly assertions that the omit contract holds (beyond .strict()).
  if (data !== null && typeof data === 'object') {
    if ('target' in data) errors.push('Copilot agent file must NOT contain a target field');
    if ('handoffs' in data) errors.push('Copilot agent file must NOT contain a handoffs field');
  }

  const unknownTools = (parsed.data.tools ?? []).filter((id) => !COPILOT_TOOL_ALIASES.has(id));
  if (unknownTools.length > 0) {
    errors.push(`unknown Copilot tool alias(es): ${unknownTools.join(', ')}`);
  }

  return errors.length > 0 ? validationFailed(errors) : validationOk();
};
