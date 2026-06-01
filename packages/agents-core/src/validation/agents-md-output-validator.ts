import {
  type OutputValidator,
  validationFailed,
  validationOk,
} from './output-validator-interface.js';

// Output validator for the aggregate `AGENTS.md` routing index. AGENTS.md is freeform
// markdown (no required fields, report §3), so this asserts the STRUCTURAL invariants the
// emitter guarantees — catching transpiler drift before write (G5):
//   - the `# Agent Routing Index` header is present,
//   - the `## Platform Notes` section is present,
//   - at least one agent section (`### name`) exists,
//   - every agent section is followed by a non-empty `Use when:` routing line.
//
// "Every AUTHORED agent has a section" is a coverage check that needs the expected agent
// set — exposed via `makeAgentsMdOutputValidator(names)` for callers (tests, Phase 08 CLI)
// that hold the full list. The registry default does the content-only structural checks.

const INDEX_HEADER = '# Agent Routing Index';
const PLATFORM_NOTES_HEADING = '## Platform Notes';

/** Extract agent section names (`### name`) in document order. */
function agentSectionNames(content: string): string[] {
  const names: string[] = [];
  for (const line of content.split('\n')) {
    const m = /^###\s+(.+?)\s*$/.exec(line);
    if (m?.[1]) names.push(m[1].trim());
  }
  return names;
}

/** True if a `### name` heading is followed (within its block) by a non-empty `Use when:` line. */
function hasUseWhenLine(content: string, name: string): boolean {
  const lines = content.split('\n');
  const start = lines.findIndex((l) => l.trim() === `### ${name}`);
  if (start < 0) return false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (/^#{2,3}\s+/.test(line)) break; // next section/agent ends this block
    const m = /^Use when:\s*(.+?)\s*$/.exec(line.trim());
    if (m?.[1]) return m[1].trim().length > 0;
  }
  return false;
}

/** Content-only structural checks shared by the default validator and the coverage factory. */
function structuralErrors(content: string): string[] {
  const errors: string[] = [];
  if (!content.includes(INDEX_HEADER)) {
    errors.push(`missing "${INDEX_HEADER}" header`);
  }
  if (!content.includes(PLATFORM_NOTES_HEADING)) {
    errors.push(`missing "${PLATFORM_NOTES_HEADING}" section`);
  }

  const names = agentSectionNames(content);
  if (names.length === 0) {
    errors.push('no agent sections (### name) found');
  }
  for (const name of names) {
    if (!hasUseWhenLine(content, name)) {
      errors.push(`agent "${name}" has no non-empty "Use when:" routing line`);
    }
  }
  return errors;
}

/** Default registry validator — structural invariants only (no coverage check). */
export const agentsMdOutputValidator: OutputValidator = (content: string) => {
  const errors = structuralErrors(content);
  return errors.length > 0 ? validationFailed(errors) : validationOk();
};

/**
 * Build a coverage-aware validator: structural checks PLUS an assertion that every expected
 * agent name has a section. Use when the full authored agent set is known (tests, CLI).
 */
export function makeAgentsMdOutputValidator(
  expectedAgentNames: readonly string[],
): OutputValidator {
  return (content: string) => {
    const errors = structuralErrors(content);
    const present = new Set(agentSectionNames(content));
    for (const name of expectedAgentNames) {
      if (!present.has(name)) errors.push(`missing routing section for agent "${name}"`);
    }
    return errors.length > 0 ? validationFailed(errors) : validationOk();
  };
}
