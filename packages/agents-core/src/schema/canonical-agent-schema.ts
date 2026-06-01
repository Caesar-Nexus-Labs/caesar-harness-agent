import { z } from 'zod';
import {
  ModelTierEnum,
  MUTATING_TOOLS,
  PermissionEnum,
  ReasoningEffortEnum,
  ToolEnum,
} from './enums.js';

// Canonical agent frontmatter schema = single source of truth.
// `z.infer` yields the CanonicalAgentFrontmatter TS type; `.parse()` validates at runtime.

const ExampleSchema = z.object({
  context: z.string().min(1),
  trigger: z.string().min(1),
});

export const CanonicalAgentFrontmatterSchema = z
  .object({
    // Identifier: domain-generic, lowercase, NO `caesar-` prefix (branding rule).
    name: z
      .string()
      .regex(/^[a-z][a-z0-9-]*$/, 'name must be lowercase kebab-case ([a-z][a-z0-9-]*)'),
    // THE routing signal — non-empty, min length enforced; prose quality gated at G3/G4.
    description: z.string().min(20, 'description must be >=20 chars (routing signal)'),
    // Must match the file's parent dir: NN-category.
    category: z
      .string()
      .regex(/^[0-9]{2}-[a-z-]+$/, 'category must be NN-kebab (e.g. 01-core-development)'),
    model: ModelTierEnum.default('inherit'),
    permission: PermissionEnum,
    // Tool allowlist. CONTRACT: empty/omitted = "no explicit restriction" → each emitter
    // applies its tool default for the permission tier (e.g. Claude omits `tools`, Codex
    // derives sandbox_mode). A non-empty list = restrict to exactly these canonical tools.
    tools: z.array(ToolEnum).default([]),
    color: z.string().optional(),
    reasoning_effort: ReasoningEffortEnum.optional(),
    when_to_use: z.string().optional(),
    examples: z.array(ExampleSchema).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Poka-yoke: read-only agents must not request mutating tools.
    if (data.permission === 'read-only') {
      const offenders = data.tools.filter((t) => (MUTATING_TOOLS as readonly string[]).includes(t));
      if (offenders.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tools'],
          message: `read-only agents cannot use mutating tools: ${offenders.join(', ')}`,
        });
      }
    }
  });

export type CanonicalAgentFrontmatter = z.infer<typeof CanonicalAgentFrontmatterSchema>;
