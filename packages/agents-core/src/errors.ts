import type { ZodIssue } from 'zod';

/** Structured error for agent file validation — carries file, optional field, and issues. */
export class AgentValidationError extends Error {
  readonly file: string;
  readonly issues: string[];

  constructor(file: string, issues: string[]) {
    super(`Agent validation failed for "${file}":\n  - ${issues.join('\n  - ')}`);
    this.name = 'AgentValidationError';
    this.file = file;
    this.issues = issues;
  }

  /** Build from zod issues, formatting path + message per issue. */
  static fromZod(file: string, zodIssues: ZodIssue[]): AgentValidationError {
    const issues = zodIssues.map((i) => {
      const path = i.path.length > 0 ? `${i.path.join('.')}: ` : '';
      return `${path}${i.message}`;
    });
    return new AgentValidationError(file, issues);
  }
}
