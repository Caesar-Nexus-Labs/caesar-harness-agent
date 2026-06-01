import { parse as parseToml } from '@iarna/toml';
import { z } from 'zod';
import {
  type OutputValidator,
  validationFailed,
  validationOk,
} from './output-validator-interface.js';

// Output validator for emitted `.codex/agents/*.toml`. Parses the EMITTED TOML back and
// zod-checks its shape/enums (G5 — catches transpiler drift before write).
//
// CONTRACT (spec §, researcher report §1): Codex per-agent files carry NO `tools` field — the
// access surface is shaped ONLY by `sandbox_mode`. This validator asserts the 3 required keys
// AND that no `tools` key leaked in.
//
// SECURITY (standards §2): read-only is enforced STRUCTURALLY upstream — the canonical schema
// rejects read-only+mutating-tools, and the permission→sandbox_mode mapping (permission-map) is
// unit-tested. This output validator is SHAPE-ONLY: it sees just the emitted TOML (not the source
// permission), so it asserts the 3 required keys, a valid `sandbox_mode` enum, and that no `tools`
// key leaked in. It cannot (and does not) re-derive the source permission tier.

const CodexConfigSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'name must be lowercase kebab-case'),
    description: z.string().min(1, 'description must be non-empty'),
    developer_instructions: z.string().min(1, 'developer_instructions must be non-empty'),
    model: z.string().min(1).optional(),
    model_reasoning_effort: z.enum(['low', 'medium', 'high']).optional(),
    sandbox_mode: z.enum(['read-only', 'workspace-write', 'danger-full-access']).optional(),
  })
  .strict(); // .strict() → a leaked `tools` key (or any extra) fails validation.

export const codexOutputValidator: OutputValidator = (content: string) => {
  let data: unknown;
  try {
    data = parseToml(content);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return validationFailed([`failed to parse Codex TOML: ${reason}`]);
  }

  const parsed = CodexConfigSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailed(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }

  // Explicit, friendly assertion that the no-tools contract holds (beyond .strict()).
  if (data !== null && typeof data === 'object' && 'tools' in data) {
    return validationFailed(['Codex agent file must NOT contain a tools field (sandbox-only)']);
  }

  return validationOk();
};
