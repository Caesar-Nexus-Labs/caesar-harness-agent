# System Architecture — Caesar Harness Agent

## High-level flow

```
agents/{NN-category}/{slug}.md          canonical source (MD + YAML superset)
        │
        │  parseAgentFile()  ── gray-matter + yaml ──► frontmatter object
        │  CanonicalAgentFrontmatterSchema (zod)  ── validate + infer type
        │  validateBody()  ── assert 6 required sections, in order
        ▼
   CanonicalAgent  { frontmatter, body }
        │
        │  transpile(agent, ctx)            per-agent emitters
        │  transpileAggregate(agents, ctx)  aggregate emitters (AGENTS.md)
        ▼
   EmittedFile[]  { tool, relativePath, content }
        │
        │  per-tool OutputValidator  ── re-validate every emitted file
        ▼
   writeOutputs(files, distRoot)   ── path-traversal-guarded sink
        ▼
dist/{tool}/{nativeSubpath}/{slug}.{ext}      +     dist/agents-md/AGENTS.md
```

## Packages

```
packages/
├── agents-core/        # the engine (schema + transpiler + emitters + validators)
│   └── src/
│       ├── schema/         enums.ts · canonical-agent-schema.ts · body-section-validator.ts
│       ├── loader/         agent-file-loader.ts · agent-discovery.ts
│       ├── mapping/        model-alias-map · permission-map · tools-map · tool-targets
│       ├── emitters/       claude · opencode · kiro · codex · factory · copilot · gemini · openhands · cursor
│       │   ├── claude-plugin.ts            (Claude Marketplace aggregate)
│       │   ├── roo-yaml.ts                 (Roo Code YAML aggregate)
│       │   ├── agents-md-emitter.ts        (aggregate fallback index)
│       │   ├── kilo-emitter.ts             (aggregate native — .kilocodemodes)
│       │   ├── opt-in-rules/               cursor · windsurf · cline (off by default)
│       │   └── register-{pilot,native,extended-native,fallback,multi-format}-emitters.ts
│       ├── validation/     one *-output-validator.ts per tool + registry
│       ├── smoke/          markdown + structured smoke-test harnesses
│       ├── transpile.ts · write-outputs.ts · errors.ts · index.ts
│       └── integration/    authored-agents-transpile.test.ts  (G5+G6 gate)
└── cli/                # the `caesar` CLI (thin layer over agents-core)
    └── src/  index.ts · commands/{build,validate,install} · reporting · resolve-paths · mcp/summon-server.ts
```

## Key design decisions

**Pure functions, separate sink.** Emitters are pure `(CanonicalAgent, ctx) → EmittedFile`. The filesystem sink (`writeOutputs`) is isolated so transpile/emit are testable without touching disk. `writeOutputs` resolves every target under `<distRoot>/<tool>/` and rejects any `..` traversal or absolute path before writing (fail-fast, no partial writes).

**Two emitter kinds.** Per-agent emitters (one file per agent) and **aggregate** emitters (the full agent set → one file). The registry supports both via `registerEmitter` / `registerAggregateEmitter`. There are **12 native + 1 fallback** emitters: 9 per-agent native (claude, opencode, kiro, codex, factory, copilot, gemini, openhands, cursor) plus **kilo, roo, and claude-plugin** — native-tier *aggregate* targets (`.kilocodemodes`, `.roomodes`, `marketplace.json` / `plugin.json` aggregates). The `agents-md` aggregate remains the universal fallback index.

**MCP Dynamic Summoning.** A Meta-Orchestrator (`caesar-coordinator`) is shipped to query an MCP stdio server (`summon-server.ts`). This allows clients to dynamically search and load the full instruction set of any of the 135 agents on-demand instead of loading them all into context, saving token space and avoiding LLM confusion.

**Dispatch by registry, not tool name.** The CLI tier-split (`splitToolsByTier`) routes a tool to the aggregate path iff `hasAggregateEmitter(tool)` is true (agents-md, kilo, roo, claude-plugin) — not a hard-coded `=== 'agents-md'` check. This requires emitters to be registered *before* the split, so `build`/`validate`/`install` call `registerNativeEmitters` + `registerExtendedNativeEmitters` + `registerMultiFormatEmitters` + `registerFallbackEmitters` up front. Install copies aggregate indexes whole and derives per-agent slugs from the folder segment for folder-nested outputs (openhands `{slug}/SKILL.md`).

**Single source of truth = zod.** `CanonicalAgentFrontmatterSchema` drives both the inferred TypeScript type and runtime validation. A `superRefine` enforces the security invariant: `permission: read-only` agents cannot declare `edit`/`write`/`bash` tools.

**Mapping tables, not per-emitter logic.** `model-alias-map`, `permission-map`, `tools-map`, and `tool-targets` centralize field→tool translation so emitters stay thin and consistent. `tool-targets.ts` is the single registry of emit destinations + their output metadata (tier, extension, subdir).

**Output validators close the loop.** Every emitted file is re-validated by its tool's `OutputValidator` before write — the transpiler never trusts an emitter blindly.

## Plugin Harness (Agent Installation)

Instead of manually copy-pasting agent files across projects, Caesar Harness Agent provides a plugin harness (`caesar add`, `caesar list`, `caesar remove`). This enables cross-platform AI agent plugins that can be installed directly from npm, GitHub, or local paths.

```mermaid
flowchart LR
    A[Source: npm/github/local] --> B(caesar add)
    B --> C[Resolve Tool Global/Project Dirs]
    C --> D[Copy prebuilt artifacts]
    D --> E[Update caesar.lock]
```

- **Scope Control**: Plugins can be installed per-project (`--cwd`) or globally (`--global`) for tools that support global agents (e.g. `~/.claude/agents`).
- **Reproducibility**: The `caesar.lock` tracks the exact version, source, integrity hash, and installed paths, guaranteeing deterministic uninstalls and listing.
- **Granular Targets**: The CLI routes each plugin's `dist/{tool}/...` artifacts into the active project's (or system's) correct subdirectory automatically.

## Output Validation
Transpiled output does not bypass quality gates. The `native-output-validators.ts` module runs the generated string against schema validations or content assertions for the target tool.

If an emitter produces invalid Markdown for Claude Code (e.g., missing YAML), the build fails.

**CLI is a thin orchestrator.** `caesar` parses args (cac), calls `agents-core` (`discoverAgents`, `transpile`, validators, `writeOutputs`), and reports. No transpile logic lives in the CLI. Exit codes: `0` ok, `1` validation fail, `2` usage error.

## The 6-gate per-agent pipeline

| Gate | Owner | Exit criteria |
|---|---|---|
| G1 Research | researcher | Primary-deep sources (≥1 official + ≥2 corroborating), current-year, 5-block output |
| G2 Draft | author | Canonical MD+YAML, all 6 body sections present in order |
| G3 Self-review | author | Tool minimalism, model tier, routing clarity, no sibling-trigger overlap |
| G4 Expert review | code-reviewer | Measurable rubric ≥13/15; read-only poka-yoke for auditors |
| G5 Transpile + validate | transpiler | All targets emit; per-tool output validators pass |
| G6 Smoke test | tester | Emitted files load + parse for every target |

G5+G6 are encoded as a permanent regression test: `packages/agents-core/src/integration/authored-agents-transpile.test.ts` auto-discovers every agent, transpiles to all targets, runs output validators + smoke tests. Concurrency rule: G1 (read-only research) parallelizes across agents; writers (G2+) serialize; subagents never spawn subagents.

## Build & release

- `caesar build` → `dist/{tool}/…` (gitignored).
- `scripts/assemble-category-packages.ts` reads `dist/` and emits `packages/categories/caesar-{slug}/` — one publishable `@caesar/{category}` package per category (generated, gitignored, never hand-edited).
- CI (`.github/workflows/ci.yml`): install → typecheck → build → test → `validate --strict` → lint.
- Release (`.github/workflows/release.yml`): manual `workflow_dispatch`, gated behind the `release` environment, defaults to dry-run; publishes only on explicit non-dry-run with approval.
