import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import {
  type OutputValidator,
  validationFailed,
  validationOk,
} from './output-validator-interface.js';

// Output validator for the aggregate `.kilocodemodes`. Re-parses the emitted YAML and zod-checks
// the `customModes` structure (G5):
//   - top-level `customModes` is a non-empty array,
//   - each mode has slug, name, roleDefinition (non-empty) + groups,
//   - groups is a non-empty array drawn ONLY from the known vocab (read | edit | command).
//
// The read-only poka-yoke (read-only agents → groups exactly [read]) is enforced + tested at the
// EMITTER (mapPermission); the canonical permission tier is not recoverable from emitted YAML
// alone, so the validator guards the GROUP VOCABULARY here (a stray `browser`/`mcp` group fails)
// — defense-in-depth against transpiler drift, complementing the emitter-side guarantee.

const KILO_GROUPS = ['read', 'edit', 'command'] as const;

const KiloModeSchema = z
  .object({
    slug: z.string().regex(/^[a-z][a-z0-9-]*$/, 'slug must be lowercase kebab-case'),
    name: z.string().min(1, 'name must be non-empty'),
    roleDefinition: z.string().min(1, 'roleDefinition must be non-empty'),
    whenToUse: z.string().optional(),
    description: z.string().optional(),
    customInstructions: z.string().optional(),
    groups: z.array(z.enum(KILO_GROUPS)).min(1, 'groups must be a non-empty array'),
  })
  .strict(); // .strict() → a stray model/iconName/source/fileRegex key fails validation.

const KiloDocSchema = z.object({
  customModes: z.array(KiloModeSchema).min(1, 'customModes must be a non-empty array'),
});

export const kiloOutputValidator: OutputValidator = (content: string) => {
  let data: unknown;
  try {
    data = parseYaml(content);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return validationFailed([`failed to parse .kilocodemodes YAML: ${reason}`]);
  }

  const parsed = KiloDocSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailed(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }

  return validationOk();
};
