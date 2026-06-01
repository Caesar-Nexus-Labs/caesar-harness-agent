import { z } from 'zod';
import {
  type OutputValidator,
  validationFailed,
  validationOk,
} from './output-validator-interface.js';

// Output validator for emitted `.kiro/agents/*.json`. Parses the EMITTED JSON back and
// zod-checks its shape (G5 — catches transpiler drift before write).
//
// SECURITY (standards §2): Kiro has no sandbox/permission field — access is gated purely by
// `tools` (what the agent CAN use) and `allowedTools` (the auto-approved, no-prompt subset).
// We assert `allowedTools` is a SUBSET of `tools` AND never contains a mutating built-in
// (write/shell) — so a regression can never silently auto-approve writes/shell commands.

/** Kiro built-in tools that mutate state — must never be auto-approved (allowedTools). */
const KIRO_MUTATING_IDS: ReadonlySet<string> = new Set(['write', 'shell']);

const KiroConfigSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'name must be lowercase kebab-case'),
    description: z.string().min(1, 'description must be non-empty'),
    prompt: z.string().min(1, 'prompt must be non-empty'),
    tools: z.array(z.string()),
    allowedTools: z.array(z.string()),
    model: z.string().min(1).optional(),
  })
  .strict();

export const kiroOutputValidator: OutputValidator = (content: string) => {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return validationFailed([`failed to parse Kiro JSON: ${reason}`]);
  }

  const parsed = KiroConfigSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailed(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }

  const { tools, allowedTools } = parsed.data;
  const errors: string[] = [];

  const toolSet = new Set(tools);
  const notInTools = allowedTools.filter((id) => !toolSet.has(id));
  if (notInTools.length > 0) {
    errors.push(`allowedTools not present in tools: ${notInTools.join(', ')}`);
  }

  const autoApprovedMutating = allowedTools.filter((id) => KIRO_MUTATING_IDS.has(id));
  if (autoApprovedMutating.length > 0) {
    errors.push(`allowedTools auto-approves mutating tools: ${autoApprovedMutating.join(', ')}`);
  }

  return errors.length > 0 ? validationFailed(errors) : validationOk();
};
