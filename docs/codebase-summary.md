# Codebase Summary — Caesar Harness Agent

A pnpm-workspace TypeScript monorepo. Canonical agent sources live in `agents/`; the engine and CLI live in `packages/`; build output lands in `dist/` (gitignored).

## Repository layout

```
Caesar-Agents/
├── agents/                       # CANONICAL SOURCE — 135 agents, author-once MD+YAML
│   ├── _template/                # canonical-agent-template.md (start here for new agents)
│   ├── 01-core-development/      (7)    02-language-specialists/ (28)
│   ├── 03-infrastructure/ (18)   04-quality-security/ (15)
│   ├── 05-data-ai/ (19)          06-developer-experience/ (12)
│   ├── 07-specialized-domains/ (11)  08-business-product/ (8)
│   └── 09-meta-orchestration/ (11)   10-research-analysis/ (6)
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
| `emitters/*-emitter.ts` | One pure emitter per tool (claude, opencode, kiro, codex, factory, copilot, gemini, openhands, cursor) |
| `emitters/claude-plugin.ts` | Claude plugin aggregate emitter (`marketplace.json`, `plugin.json`) |
| `emitters/roo-yaml.ts` | Roo Code aggregate emitter (`.roomodes`) |
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
| `packages/cli/src/commands/build-command.ts` | Discovers, transpiles, and writes native targets. |
| `packages/cli/src/commands/validate-command.ts` | Validates canonical sources and optionally runs output validators. |
| `packages/cli/src/commands/install-command.ts` | (Legacy) Copies built output from `dist/` into a user's project. |
| `packages/cli/src/commands/add-command.ts` | (Harness) Installs plugins from npm/github/local into project or global dir. |
| `packages/cli/src/commands/remove-command.ts` | (Harness) Uninstalls plugins using `caesar.lock`. |
| `packages/cli/src/commands/list-command.ts` | (Harness) Lists installed plugins from `caesar.lock`. |
| `packages/cli/src/mcp/summon-server.ts` | Stdio MCP server for dynamic agent summoning. |
| `packages/cli/src/plugin-source.ts` | Resolves npm, GitHub, and local plugin URLs to downloaded dirs. |
| `packages/cli/src/caesar-lock.ts` | Manages the `caesar.lock` manifest of installed plugins. |
| `packages/cli/src/resolve-global-path.ts` | Platform-specific logic for tool global agent directories. |
| `packages/cli/src/index.ts` | CAC wiring, argument parsing, and command routing. |
| `resolve-paths.ts` | Locate repo root / agents / dist |
| `index.ts` | cac setup, command registration, exit-code mapping (0/1/2) |

## Tests

795 tests across 30 files (vitest). Unit tests per emitter/validator/mapping + snapshot tests for emitter output + the integration gate that transpiles + smoke-tests all 135 agents to every target.

## Conventions

See [`code-standards.md`](code-standards.md). In short: pure TypeScript (ESM/NodeNext, strict), files < 200 lines, kebab-case filenames, Biome for lint/format, zod as the single source of truth.
