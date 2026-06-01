import matter from 'gray-matter';
import { z } from 'zod';
import {
  type OutputValidator,
  validationFailed,
  validationOk,
} from './output-validator-interface.js';

// Output validator for emitted `.agents/skills/{slug}/SKILL.md`. Parses the EMITTED frontmatter
// back and zod-checks its shape (G5).
//
// CONTRACT (inherit-only, current `.agents/skills` format): the OpenHands emitter emits name +
// description ONLY. `.strict()` rejects ANY extra key — so a leaked `triggers`/`tools`/`model`
// (the inherit invariant; schema has no keywords field, skill ships agent-invoked) fails here.

const OpenHandsFrontmatterSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'name must be lowercase kebab-case'),
    description: z.string().min(1, 'description must be non-empty'),
  })
  .strict(); // .strict() → a leaked triggers/tools/model (or any extra) key fails validation.

export const openhandsOutputValidator: OutputValidator = (content: string) => {
  let data: unknown;
  try {
    data = matter(content).data;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return validationFailed([`failed to parse OpenHands frontmatter: ${reason}`]);
  }

  const parsed = OpenHandsFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailed(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }

  return validationOk();
};
