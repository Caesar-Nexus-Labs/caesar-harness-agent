import matter from 'gray-matter';
import { z } from 'zod';
import {
  type OutputValidator,
  validationFailed,
  validationOk,
} from './output-validator-interface.js';

// Output validator for Qoder native subagents (`.qoder/agents/{slug}.md`).

const QoderFrontmatterSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'name must be lowercase kebab-case'),
    description: z.string().min(1, 'description must be non-empty'),
    model: z.string().min(1),
    tools: z.array(z.string().min(1)).optional(),
    color: z.string().min(1).optional(),
    effort: z.enum(['low', 'medium', 'high']).optional(),
    permissionMode: z.enum(['plan', 'acceptEdits', 'default']),
    mcpServers: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const qoderOutputValidator: OutputValidator = (content: string) => {
  let data: unknown;
  try {
    data = matter(content).data;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return validationFailed([`failed to parse Qoder frontmatter: ${reason}`]);
  }

  const parsed = QoderFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailed(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }

  return validationOk();
};
