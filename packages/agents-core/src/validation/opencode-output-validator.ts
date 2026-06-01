import matter from 'gray-matter';
import { z } from 'zod';
import {
  type OutputValidator,
  validationFailed,
  validationOk,
} from './output-validator-interface.js';

// Output validator for emitted `.opencode/agents/*.md`. Parses the EMITTED frontmatter back
// and zod-checks its shape/enums (G5). Uses the current `permission:` block (not deprecated
// `tools:{}`) per researcher-260530-0216-opencode-rules-tools-format §1.
//
// SECURITY (standards §2): the permission block is the STRUCTURAL access gate. We assert the
// (edit, bash) pair is one of the three coherent mappings; this guarantees a read-only posture
// (`edit: deny`) can never escalate bash to allow/ask — a regression there fails the build.

const OpenCodeActionEnum = z.enum(['allow', 'ask', 'deny']);

const OpenCodePermissionSchema = z
  .object({
    edit: OpenCodeActionEnum,
    bash: OpenCodeActionEnum,
  })
  .strict();

const OpenCodeFrontmatterSchema = z
  .object({
    description: z.string().min(1, 'description must be non-empty'),
    mode: z.literal('subagent'),
    model: z.string().min(1).optional(),
    temperature: z.number().min(0).max(1).optional(),
    permission: OpenCodePermissionSchema,
  })
  .strict();

/** The exact (edit, bash) pairs the permission map produces: read-only / edit / full. */
const COHERENT_PERMISSION_PAIRS: ReadonlySet<string> = new Set([
  'deny|deny', // read-only
  'allow|ask', // edit
  'allow|allow', // full
]);

export const opencodeOutputValidator: OutputValidator = (content: string) => {
  let data: unknown;
  try {
    data = matter(content).data;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return validationFailed([`failed to parse OpenCode frontmatter: ${reason}`]);
  }

  const parsed = OpenCodeFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailed(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }

  const { edit, bash } = parsed.data.permission;
  if (!COHERENT_PERMISSION_PAIRS.has(`${edit}|${bash}`)) {
    return validationFailed([
      `incoherent permission block (edit: ${edit}, bash: ${bash}); read-only requires edit:deny,bash:deny`,
    ]);
  }

  return validationOk();
};
