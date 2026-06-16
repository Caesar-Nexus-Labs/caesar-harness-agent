// CLI-specific error types carrying the exit code each maps to.
// Exit-code contract (phase-08 §Non-functional): 0 ok, 1 validation fail, 2 usage error.
// Keeping the code on the error lets index.ts map any thrown error to a process exit code
// without string-matching messages (Poka-yoke: the code is the single source of truth).

export const EXIT_OK = 0;
export const EXIT_VALIDATION = 1;
export const EXIT_USAGE = 2;

/** Bad invocation: unknown tool/category flag, missing required arg, etc. → exit 2. */
export class UsageError extends Error {
  readonly exitCode = EXIT_USAGE;

  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

/**
 * `install` invoked before `build` produced artifacts for the tool → exit 2 (usage).
 * Carries a hint telling the user to run build first.
 */
export class BuildNotFoundError extends Error {
  readonly exitCode = EXIT_USAGE;
  readonly hint: string;

  constructor(message: string, hint: string) {
    super(message);
    this.name = 'BuildNotFoundError';
    this.hint = hint;
  }
}

export class PluginNotFoundError extends UsageError {
  constructor(message: string) {
    super(message);
    this.name = 'PluginNotFoundError';
  }
}

export class RegistryFetchError extends Error {
  readonly exitCode = EXIT_VALIDATION;

  constructor(message: string) {
    super(message);
    this.name = 'RegistryFetchError';
  }
}
