# Codebase Summary — CaesarAgent

A pnpm-workspace TypeScript monorepo. Canonical agent sources live in `agents/`; the engine and CLI live in `packages/`; build output lands in `dist/` (gitignored).

## Repository layout

```
Caesar-Agents/
├── agents/                       # CANONICAL SOURCE — 134 agents, author-once MD+YAML
│   ├── _template/                # canonical-agent-template.md (start here for new agents)
│   ├── 01-core-development/      (7)    02-language-specialists/ (28)
│   ├── 03-infrastructure/ (18)   04-quality-security/ (15)
│   ├── 05-data-ai/ (19)          06-developer-experience/ (12)
│   ├── 07-specialized-domains/ (11)  08-business-product/ (8)
│   └── 09-meta-orchestration/ (10)   10-research-analysis/ (6)
├── packages/
│   ├── agents-core/              # @caesar/agents-core — engine
│   ├── cli/                      # @caesar/cli — `caesar` CLI
│   └── categories/               # GENERATED @caesar/{category} packages (gitignored)
├── scripts/assemble-category-packages.ts   # dist/ → category packages
├── docs/                         # this documentation set
├── dist/                         # build output (gitignored)
└── .github/workflows/            # ci.yml · release.yml
```

## @caesar/agents-core — key modules

| Module | Responsibility |
|---|---|
| `schema/enums.ts` | Canonical enums (model tiers, permissions, tools, colors) — the vocabulary |
| `schema/canonical-agent-schema.ts` | zod frontmatter schema + inferred type; read-only poka-yoke refinement |
| `schema/body-section-validator.ts` | Asserts the 6 required body sections, in order |
| `loader/agent-file-loader.ts` | Parse one `.md` → `CanonicalAgent` (gray-matter + yaml + zod) |
| `loader/agent-discovery.ts` | Glob `agents/NN-*/*.md` → descriptors (path, category, slug) |
| `mapping/model-alias-map.ts` | `inherit/fast/balanced/top` → concrete model id (+ override) |
| `mapping/permission-map.ts` | `read-only/edit/full` → each tool's permission representation |
| `mapping/tools-map.ts` | canonical tools → per-tool tool ids |
| `mapping/tool-targets.ts` | Registry of emit targets + output metadata (tier/ext/subdir) |
| `emitters/*-emitter.ts` | One pure emitter per tool (claude, opencode, kiro, codex, factory, copilot) |
| `emitters/agents-md-emitter.ts` | Aggregate fallback `AGENTS.md` routing index |
| `emitters/opt-in-rules/` | cursor / windsurf / cline rule emitters (off by default) |
| `validation/*-output-validator.ts` | Re-validate each tool's emitted output + registry |
| `smoke/` | Markdown + structured smoke-test harnesses (G6) |
| `transpile.ts` | `transpile()` (per-agent) + `transpileAggregate()` |
| `write-outputs.ts` | Path-traversal-guarded filesystem sink |
| `integration/authored-agents-transpile.test.ts` | G5+G6 regression gate over all agents |

## @caesar/cli — commands

| File | Command |
|---|---|
| `commands/build-command.ts` | `caesar build` — discover → transpile → validate → write `dist/{tool}/` |
| `commands/validate-command.ts` | `caesar validate [--strict]` — schema + body (+ output validators) |
| `commands/install-command.ts` | `caesar install <category> --tool <t>` — copy artifacts into a project |
| `reporting/cli-reporter.ts` | Human + `--json` output |
| `resolve-paths.ts` | Locate repo root / agents / dist |
| `index.ts` | cac setup, command registration, exit-code mapping (0/1/2) |

## Tests

348 tests across 28 files (vitest). Unit tests per emitter/validator/mapping + snapshot tests for emitter output + the integration gate that transpiles + smoke-tests all 134 agents to every target.

## Conventions

See [`code-standards.md`](code-standards.md). In short: pure TypeScript (ESM/NodeNext, strict), files < 200 lines, kebab-case filenames, Biome for lint/format, zod as the single source of truth.
