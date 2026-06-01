// Normalize a thrown error into a flat list of issue strings. AgentValidationError /
// TranspileValidationError carry a structured `issues`/`issues`-like array; everything else
// degrades to its message. Shared by build + validate so both report failures identically.

/** Pull structured `issues` off a validation error, else fall back to the message. */
export function extractIssues(err: unknown): string[] {
  if (err !== null && typeof err === 'object' && 'issues' in err) {
    const issues = (err as { issues: unknown }).issues;
    if (Array.isArray(issues)) return issues.map(String);
  }
  return [err instanceof Error ? err.message : String(err)];
}
