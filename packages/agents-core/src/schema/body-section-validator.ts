// Validates the agent prompt BODY contains the 6 mandatory expert-prompt sections,
// in order. Checks presence/order only — prose quality is gated by G4 review (rubric).

/** The 6 canonical section headings, in required order. */
export const REQUIRED_SECTIONS = [
  'Role & Expertise',
  'When to Use',
  'Workflow',
  'Checklist & Heuristics',
  'Output Contract',
  'Boundaries',
] as const;

export interface BodyValidationResult {
  ok: boolean;
  missingSections: string[];
  outOfOrder: boolean;
  /** Total line count of the body. Informational. */
  lineCount: number;
  /** Non-fatal advisories (e.g. body exceeds the 300-line soft cap). Never affects `ok`. */
  warnings: string[];
}

/** Soft cap on body length. Exceeding it warns but NEVER fails validation. */
export const BODY_SOFT_CAP_LINES = 300;

/** Extract `##`/`###` heading texts (trimmed) in document order. */
function extractHeadings(body: string): string[] {
  const headings: string[] = [];
  for (const line of body.split('\n')) {
    const match = /^#{2,3}\s+(.+?)\s*$/.exec(line);
    if (match?.[1]) headings.push(match[1].trim());
  }
  return headings;
}

/** Check all 6 required sections are present and appear in canonical order. */
export function validateBody(body: string): BodyValidationResult {
  const headings = extractHeadings(body);
  const missingSections = REQUIRED_SECTIONS.filter((s) => !headings.includes(s));

  // Order check: indices of present required sections must be strictly increasing.
  const presentIndices = REQUIRED_SECTIONS.filter((s) => headings.includes(s)).map((s) =>
    headings.indexOf(s),
  );
  const outOfOrder = presentIndices.some((idx, i) => i > 0 && idx <= (presentIndices[i - 1] ?? -1));

  // Line count is informational; exceeding the soft cap warns but never fails (`ok` stays
  // driven only by section presence + order, so the build never breaks on length).
  const lineCount = body.split('\n').length;
  const warnings =
    lineCount > BODY_SOFT_CAP_LINES
      ? [
          `body is ${lineCount} lines (>${BODY_SOFT_CAP_LINES}-line soft cap); trim or split deep reference material to a sidecar`,
        ]
      : [];

  return {
    ok: missingSections.length === 0 && !outOfOrder,
    missingSections,
    outOfOrder,
    lineCount,
    warnings,
  };
}
