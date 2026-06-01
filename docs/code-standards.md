# Code Standards — CaesarAgent

## Language & module system

- **Pure TypeScript.** No plain JS, no Python anywhere in the product.
- **ESM + NodeNext**, `strict` mode. Use `.js` extensions on relative imports (NodeNext requirement).
- **Node ≥ 20.** Engines pinned in every `package.json`.
- Dual ESM+CJS output via `tsup` for the engine; ESM-only for the CLI bin.

## Files & modules

- **< 200 lines per file.** Split by responsibility when a file grows past that.
- **kebab-case filenames** with descriptive, self-documenting names (long is fine — names are read by Grep/Glob/LLM tooling). One emitter per tool, one validator per tool, one mapping table per concern.
- No orphan files: every file belongs to a module, command, test, or documented purpose.
- Co-locate tests as `*.test.ts` next to the unit under test.

## Schema & validation

- **zod is the single source of truth.** Define the schema once; infer the TS type from it; validate at runtime. Never duplicate the shape as a hand-written interface.
- **Validate at boundaries only.** Parse/validate canonical input (frontmatter, body) and re-validate emitted output. Trust internal invariants once established — don't add defensive checks for impossible internal states.
- The read-only **poka-yoke** is a schema refinement, not a runtime convention: `permission: read-only` ⇒ no `edit`/`write`/`bash` tools. Keep security invariants structural.

## Emitters

- Each emitter is a **pure function** `(CanonicalAgent, EmitContext) → EmittedFile` (or aggregate `(agents[], ctx) → EmittedFile`). No I/O, no global state.
- Field translation goes through the shared mapping tables (`mapping/`), not bespoke per-emitter logic.
- Every emitter has a paired output validator and snapshot test.

## CLI

- The CLI is a **thin orchestrator** — arg parsing + calling `agents-core` + reporting. No transpile logic.
- Exit codes: `0` ok · `1` validation failure · `2` usage error.
- No destructive writes outside `--out`/`--dest`; `install` refuses to clobber without `--force`.

## Naming & branding

- **Agent names are domain-generic** — `[a-z][a-z0-9-]*`, no `caesar-` prefix (they read naturally inside any tool).
- Branding (`@caesar/*`, `caesar` CLI) lives only at the package/command boundary.
- Avoid generic identifiers (`utils`, `helpers`, `manager`) unless the boundary is precise.

## Comments

- Explain the **why**, not the what: hidden constraints, invariants, security rationale, surprising behavior.
- **No plan/artifact references in code or filenames** — no phase numbers, finding codes, or audit labels. The reason must be stable and self-contained (allowed: RFC/CVE/SQLSTATE/issue numbers).

## Tooling

- **Biome** for lint + format (single binary, fast, minimal config).
- **vitest** for tests; snapshot tests for emitter output.
- Run before every push: `pnpm build && pnpm test && pnpm validate && pnpm lint` (the `pnpm run ci` script).

## Dependencies

- Pin exact versions. Prefer the standard library and well-established packages.
- `files` whitelist on publishable packages ships `dist/` only — no source, no tests, no secrets.

## Principles

YAGNI, KISS, DRY. Touch only what the task requires. Every changed line traces to a requirement, a verification failure, or a necessary integration constraint.
