import matter from 'gray-matter';
import { z } from 'zod';
import {
  type OutputValidator,
  validationFailed,
  validationOk,
} from './output-validator-interface.js';

// Output validator for emitted `.factory/droids/*.md`. Parses the EMITTED frontmatter back and
// zod-checks its shape/enums (G5).
//
// SECURITY (standards §2): Factory gates access via the `tools` CATEGORY string. The category
// is the structural lever — `read-only` grants only Read/LS/Grep/Glob (no Create/Edit/Execute).
// The full tier OMITS `tools` (Factory has no `all` category; omit = all tools), so we assert
// the field, when present, is one of the known restrictive categories.

const FactoryFrontmatterSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'name must be lowercase kebab-case'),
    description: z.string().min(1, 'description must be non-empty'),
    model: z.string().min(1, 'model must be non-empty'),
    reasoningEffort: z.enum(['low', 'medium', 'high']).optional(),
    // Category string; omitted entirely for the full tier (grants all tools).
    tools: z.enum(['read-only', 'edit']).optional(),
  })
  .strict();

export const factoryOutputValidator: OutputValidator = (content: string) => {
  let data: unknown;
  try {
    data = matter(content).data;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return validationFailed([`failed to parse Factory frontmatter: ${reason}`]);
  }

  const parsed = FactoryFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailed(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }

  return validationOk();
};
