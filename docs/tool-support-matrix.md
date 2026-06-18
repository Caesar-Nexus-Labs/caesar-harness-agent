# Tool Support Matrix

Caesar Harness Agent transpiles each canonical agent to the native subagent format of the tools below. **Native** tools get a first-class per-agent file; **fallback** tools are covered by a single shared `AGENTS.md` routing index (plus optional opt-in rule files where per-agent activation matters).

_Verified 2026-06-01 against current tool documentation, local emitters, and output validators._

## Native targets (10)

| Tool | Output path | Format notes | Emitter |
|---|---|---|---|
| **Claude Code** | `.claude/agents/{slug}.md` | YAML frontmatter: name, description, tools (CSV), model, permission mode, color; `examples`/`when_to_use` folded into the description block | `claude` |
| **OpenCode** | `.opencode/agents/{slug}.md` | `mode: subagent`, model, temperature, and `permission: {}` (docs-preferred, not the deprecated `tools: {}`) | `opencode` |
| **Kiro** | `.kiro/agents/{slug}.json` | JSON: name, description, prompt, tools, allowedTools, model | `kiro` |
| **Codex** | `.codex/agents/{slug}.toml` | TOML: name, description, developer_instructions, model, model_reasoning_effort, `sandbox_mode` — **no tools allowlist** (permission derived to sandbox mode) | `codex` |
| **Factory / Droid** | `.factory/droids/{slug}.md` | YAML: name, description, model, reasoningEffort, tools category | `factory` |
| **GitHub Copilot / VS Code** | `.github/agents/{slug}.agent.md` | YAML: name, description, tools[], model, target | `copilot` |
| **Gemini CLI** | `.gemini/agents/{slug}.md` | YAML: name, description, `kind: local`. **Inherit-only** — no tools/model emitted (inherits the Gemini session surface; dodges unverified tool-ids). | `gemini` |
| **OpenHands** | `.agents/skills/{slug}/SKILL.md` | YAML: name, description. Folder-per-skill; **no triggers** (agent-invoked); model/permission/tools inherit. | `openhands` |
| **Kilo Code** | `.kilocodemodes` (one file) | YAML `customModes:` array. **Aggregate** target: slug, name, roleDefinition, groups (real permission), whenToUse/description/customInstructions. **No per-agent model** (legacy format → inherits). | `kilo` |
| **Roo Code** | `.roomodes` (one file) | YAML `customModes:` array (same structure as kilo). **Aggregate** target: slug, name, roleDefinition, groups (real permission), whenToUse/description/customInstructions. (Roo Code repository was archived 2026-05-15, but native output is still emitted for backward compatibility). | `roo` |

## Fallback targets (shared `AGENTS.md`)

A single aggregated `dist/agents-md/AGENTS.md` routing index covers every tool below. It groups agents by category with a one-line "when to use" + permission/tool summary per agent, and a Platform Notes section documenting each tool's limits.

| Tool | How it consumes Caesar Harness Agent | Opt-in per-agent rule file |
|---|---|---|
| **Cursor** | reads `AGENTS.md` (Custom Modes removed in v2.1 — index is always-on guidance) | `.cursor/rules/{slug}.mdc` (`alwaysApply: false`, description, globs) |
| **Windsurf** | reads `AGENTS.md` | `.windsurf/rules/{slug}.md` (`trigger: model_decision`; ≤12k chars/file, enforced) |
| **Cline** | reads `AGENTS.md` | `.clinerules/{NN}-{slug}.md` (optional `paths:`) |
| **Antigravity** | reads `AGENTS.md` / `GEMINI.md` (no confirmed native subagent dir — use `--tool gemini` if running Gemini CLI) | — |
| **Amp** | reads `AGENTS.md` as **first-class native config** (cwd + parent dirs to `$HOME` + lazy subtree; fallback `AGENT.md`/`CLAUDE.md`) — no per-subagent drop-in format | deferred — experimental `.amp/plugins/*.ts` via `experimental.createAgent` (unstable API, opt-in) |
| **OpenCode** | _also_ reads `AGENTS.md` (in addition to its native `.opencode/agents/*.md`) | — |

> Kilo and OpenHands now have **native** emitters (above). They also still consume the shared `AGENTS.md` (Kilo auto-delegates; the OpenHands SDK reads the always-on root index) — no regression.

## Not emitted

None. All target formats are fully supported and emitted.

## Field mapping summary

| Canonical field | Mapping |
|---|---|
| `model` | `inherit` → inherit · `fast` → haiku-class · `balanced` → sonnet-class · `top` → opus-class. Concrete `provider/model-id` emitted where the tool requires it (OpenCode/Kiro); per-install override via `EmitContext.modelOverrides`. |
| `permission` | `read-only` / `edit` / `full` → Claude permission mode + restricted tools · OpenCode `permission: {}` · Codex `sandbox_mode` · Factory tools category. |
| `tools` | canonical `read, grep, glob, edit, write, bash, web` → each tool's tool ids. Codex has no allowlist (derives `sandbox_mode` only). |
| `examples`, `when_to_use` | folded into Claude `description` blocks and the `AGENTS.md` routing entry. |

A structural invariant enforced by the schema: **read-only agents cannot be granted `edit`/`write`/`bash`** (zod refinement). Security/audit/research agents are read-only by construction.

## Post-v1 backlog

Tracked in [`project-roadmap.md`](project-roadmap.md): the Amp TS-plugin emitter (separate plan), a native **Antigravity** target (gated on official confirmation of its subagent directory — Gemini CLI native ships now and serves the substrate Antigravity is built on), **Gemini full-fidelity** (tools+model — deferred; shipped inherit-only per decision), the future Kilo per-agent `.kilo/agents/*.md` format (has per-agent model), nested per-category `AGENTS.md`, and model-provider config presets.
