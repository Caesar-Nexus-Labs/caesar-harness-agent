# Tech Stack — Caesar Harness Agent Dev-Subagents Suite

**Status:** locked (bootstrap 2026-05-30) · **Type:** greenfield, isolated from management kit (`.claude/`, `.opencode/`).

---

## 1. Language & Runtime

| Concern | Choice | Rationale |
|---|---|---|
| Transpiler / CLI | **TypeScript (pure)** — no plain JS, no Python | Type-safety critical for 14-tool schema + per-tool validators; canonical schema as TS types is single source of truth |
| Runtime | Node.js ≥ 20 (LTS) | npm distribution; ESM modules |
| Build | `tsup` (or `tsc`) → ESM+CJS dual | Library + CLI bundling, fast |
| Test | `vitest` | TS-native, fast, snapshot tests for emitters |
| Lint/format | `eslint` + `prettier` (or `biome`) | Decide in plan; keep light |
| Schema validation | `zod` | Canonical agent schema = zod schema → infer TS type + runtime validate frontmatter |
| Frontmatter parse | `gray-matter` | YAML frontmatter ↔ object |
| YAML emit | `yaml` | Kiro JSON via `JSON.stringify`; Codex TOML via `@iarna/toml` |
| TOML emit | `@iarna/toml` | Codex `.toml` output |

**Rejected:** plain JS (no type-safety for complex schema), Python (distribution is npm/JS-native).

---

## 2. Distribution Model

**npm packages (monorepo) + CLI installer.**

```
@caesar/agents-core        # canonical schema, transpiler engine, emitters
@caesar/cli                # `caesar` CLI: build, validate, add, remove, list
@caesar/core-dev           # category plugin: 01-core-development agents (built artifacts)
@caesar/lang               # 02-language-specialists
@caesar/infra              # 03-infrastructure-devops
... (one package per category)
```

- Monorepo manager: **pnpm workspaces** (or npm workspaces — decide in plan).
- Each category = installable package; users install only what they need.
- CLI: `caesar add <source>` installs plugins directly into the user project or globally (`--global`). Legacy `install` command copies built artifacts.
- Mirrors existing `.opencode` precedent (`@claudekit/opencode-plugins`).

---

## 3. Repository Topology

```
Caesar-Agents/                       # git root = PRODUCT (greenfield)
├── agents/                          # CANONICAL SOURCE (author-once, MD+YAML)
│   ├── 01-core-development/
│   ├── 02-language-specialists/
│   └── ... (10 numbered categories)
├── packages/
│   ├── agents-core/                 # schema + transpiler + emitters (TS)
│   │   └── src/
│   │       ├── schema/              # zod canonical schema + per-tool validators
│   │       ├── emitters/            # claude, opencode, kiro, codex, factory, copilot, gemini, openhands, kilo, agents-md
│   │       └── transpile.ts
│   └── cli/                         # caesar CLI
├── dist/                            # BUILD OUTPUT (gitignored), per tool
│   ├── claude/.claude/agents/...
│   ├── opencode/.opencode/agents/...
│   ├── kiro/.kiro/agents/...
│   ├── codex/.codex/agents/...
│   ├── factory/.factory/droids/...
│   ├── copilot/.github/agents/...
│   ├── gemini/.gemini/agents/...
│   ├── openhands/.agents/skills/.../SKILL.md
│   ├── kilo/.kilocodemodes
│   └── agents-md/AGENTS.md          # fallback index for rules-only tools
├── docs/
├── package.json                     # workspace root
└── README.md
```

**Isolation:** `.opencode/`, `release-manifest.json`, `.repomixignore` are management-kit artifacts → gitignored, NOT part of product history. `.claude/` already gitignored (kit tooling).

---

## 4. 14-Tool Target Matrix (verified 2026-05-30)

Verified against current tool documentation and local output validators on 2026-05-30.

| # | Tool | Native subagent? | Output format | Emitter target | Tier |
|---|---|---|---|---|---|
| 1 | **Claude Code** | ✅ | `.claude/agents/*.md` (YAML: name, description, tools CSV, model, permissionMode, color) | `claude` | native |
| 2 | **OpenCode** | ✅ | `.opencode/agents/*.md` (desc, mode: subagent, model, temperature, tools{} OR permission{}) | `opencode` | native |
| 3 | **Kiro** | ✅ | `.kiro/agents/*.json` (name, description, prompt, tools, allowedTools, model) | `kiro` | native |
| 4 | **Codex** | ✅ | `.codex/agents/*.toml` (name, description, developer_instructions, model, model_reasoning_effort, sandbox_mode) — NO tools allowlist | `codex` | native |
| 5 | **Factory/Droid** | ✅ | `.factory/droids/*.md` (YAML: name, description, model, reasoningEffort, tools category) | `factory` | native |
| 6 | **GitHub Copilot / VS Code** | ✅ | `.github/agents/*.agent.md` (YAML: name, description, tools[], model, target, handoffs[] VSCode-only) | `copilot` | native |
| 7 | **Kilo Code** | ✅ | `.kilocodemodes` aggregate mode file | `kilo` | native aggregate |
| 8 | **OpenHands** | ✅ | `.agents/skills/*/SKILL.md` | `openhands` | native skill output |
| 9 | **Cursor** | ❌ (Custom Modes removed v2.1) | `AGENTS.md` + optional `.cursor/rules/*.mdc` (description, globs, alwaysApply) | `agents-md` + `cursor` opt | fallback |
| 10 | **Windsurf** | ❌ | `AGENTS.md` + optional `.windsurf/rules/*.md` (trigger, globs; ≤12k char) | `agents-md` + `windsurf` opt | fallback |
| 11 | **Cline** | ❌ | `AGENTS.md` + optional `.clinerules/NN-*.md` (paths) | `agents-md` + `cline` opt | fallback |
| 12 | **Antigravity** | ❌ | `AGENTS.md` / `GEMINI.md` | `agents-md` | fallback |
| 13 | **Amp** | ❌ (TS plugin only, no MD subagent) | `AGENTS.md` (guidance) + optional `.amp/plugins/*.ts` | `agents-md` + `amp` opt | fallback/special |
| 14 | **Roo Code** | ✅ but **SUNSET 2026-05-15** | `.roomodes` (legacy only) | skip / legacy opt | deprecated |

**Emitter build order:** `claude` + `opencode` first (locally testable for G6 smoke-test) → `kiro`/`codex`/`factory`/`copilot` → `gemini`/`openhands`/`kilo` → `agents-md` aggregated fallback index.

**Fallback strategy:** ALWAYS emit one aggregated root `AGENTS.md` routing index for AGENTS.md-compatible tools and rules-only workflows. Per-tool conditional rule files are optional opt-in when per-agent activation is needed. Roo `.roomodes` = skip unless legacy compatibility is requested.

---

## 5. Canonical Schema (MD + YAML superset)

One `.md` file per agent in `agents/{NN-category}/{agent-name}.md`. Frontmatter = zod-validated superset; transpiler maps each field per tool, drops unsupported gracefully.

```yaml
---
name: code-reviewer                  # [a-z][a-z0-9-]*  — domain-generic, no caesar- prefix
description: >                       # THE routing signal (trigger phrases, when-to-use)
  Expert code review specialist. Reviews code for quality, security, maintainability.
  Use proactively immediately after writing or modifying code.
category: 01-core-development
model: inherit                       # inherit | fast | balanced | top  → mapped per provider
permission: read-only                # read-only | edit | full → sandbox_mode/permissionMode/tools
tools: [read, grep, glob]            # canonical lowercase → mapped to each tool's tool ids
color: blue                          # cosmetic (Claude/Factory); no-op elsewhere
reasoning_effort: high               # low | medium | high → Codex/Factory/Amp; no-op elsewhere
when_to_use: |                       # extended routing context (→ AGENTS.md index entry)
  After any code change; before merge/deploy; tech-debt investigation.
examples:                            # optional — routing precision (Claude description blocks)
  - context: User finished implementing an endpoint
    trigger: "I've finished the auth endpoint"
---

# <Expert system prompt body — 6 required sections>
# 1. Role + expertise   2. When-to-use   3. Numbered workflow ("When invoked: 1..2..3")
# 4. Checklist/heuristics   5. Output contract   6. Boundaries (what NOT to do)
```

**Field → tool mapping (high level):**
- `model` alias: `inherit`→inherit; `fast`→haiku/gpt-5.4-mini; `balanced`→sonnet/gpt-5.4; `top`→opus/gpt-5.5.
- `permission`: `read-only`→Claude `permissionMode`+restricted tools / OpenCode `permission:{edit:deny,bash:deny}` / Codex `sandbox_mode:read-only` / Factory `tools: read-only`.
- `tools` canonical (`read,grep,glob,edit,write,bash,web`) → per-tool ids (Claude `Read,Grep,Glob`; OpenCode bools/permission; Factory categories; Copilot array). Codex has NO tools allowlist → derive `sandbox_mode` only.
- `examples`/`when_to_use` → folded into Claude `description` + AGENTS.md index entry.

---

## 6. The 6-Gate Per-Agent Pipeline

Each agent passes ALL gates before "done". Designed for autonomous sequential agent-team execution.

| Gate | Owner | Exit criteria |
|---|---|---|
| G1 Research | `researcher` | Current domain docs + best practices + failure modes, with sources cited |
| G2 Draft | author | Canonical MD+YAML, all 6 prompt sections present |
| G3 Self-review | author | Tool-minimalism + model routing + description routing + no sibling overlap |
| G4 Expert review | `code-reviewer` | Prompt quality, domain correctness, boundaries, anti-pattern scan — loop until pass |
| G5 Transpile + validate | transpiler | All targets emit; per-tool schema validators pass |
| G6 Smoke test | `tester` | Generated files load + parse in ≥ Claude + OpenCode locally |

Concurrency: G1 (research) parallelizable across agents (read-only); writers (G2+) serialized. Subagents do not spawn subagents — chain via orchestrator.

---

## Future Decisions

1. Whether to ship an Amp TS-plugin emitter or leave Amp as AGENTS.md-only.
