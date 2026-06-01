import matter from 'gray-matter';
import { z } from 'zod';
import {
  type OutputValidator,
  validationFailed,
  validationOk,
} from './output-validator-interface.js';

// Output validator for emitted `.gemini/agents/*.md`. Parses the EMITTED frontmatter back and
// zod-checks its shape (G5).
//
// CONTRACT (inherit-only, user decision 2026-06-01): the Gemini emitter emits name + description
// + `kind` ONLY. `.strict()` rejects ANY extra key — so a leaked `tools`/`model` (the inherit
// invariant that keeps unverified Gemini tool-ids out of the output) fails validation here.

const GeminiFrontmatterSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'name must be lowercase kebab-case'),
    description: z.string().min(1, 'description must be non-empty'),
    kind: z.enum(['local', 'remote']).optional(),
  })
  .strict(); // .strict() → a leaked `tools`/`model` (or any extra) key fails validation.

export const geminiOutputValidator: OutputValidator = (content: string) => {
  let data: unknown;
  try {
    data = matter(content).data;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return validationFailed([`failed to parse Gemini frontmatter: ${reason}`]);
  }

  const parsed = GeminiFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailed(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }

  return validationOk();
};
