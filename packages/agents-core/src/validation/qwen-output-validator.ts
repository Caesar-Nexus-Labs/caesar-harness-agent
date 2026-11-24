import matter from 'gray-matter';
import { z } from 'zod';
import {
  type OutputValidator,
  validationFailed,
  validationOk,
} from './output-validator-interface.js';

// Output validator for Qwen Code skills (`.qwen/skills/{slug}/SKILL.md`).

const QwenHookGroupSchema = z.array(
  z.object({
    matcher: z.string().min(1).optional(),
    hooks: z.array(
      z.object({
        type: z.literal('command'),
        command: z.string().min(1),
      }),
    ),
  }),
);

const QwenFrontmatterSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'name must be lowercase kebab-case'),
    description: z.string().min(1, 'description must be non-empty'),
    hooks: z.record(z.string(), QwenHookGroupSchema).optional(),
  })
  .strict();

export const qwenOutputValidator: OutputValidator = (content: string) => {
  let data: unknown;
  try {
    data = matter(content).data;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return validationFailed([`failed to parse Qwen skill frontmatter: ${reason}`]);
  }

  const parsed = QwenFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailed(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }

  return validationOk();
};
