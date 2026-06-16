# Project Overview (PDR) — Caesar Harness Agent Dev-Subagents Suite

**Status:** v1 implemented (2026-05-30) · **Type:** greenfield TypeScript monorepo

## Problem

Every AI coding tool — Claude Code, OpenCode, Kiro, Codex, Factory, GitHub Copilot, Cursor, Windsurf, Cline, and others — ships its own subagent/custom-agent format. Teams that want a consistent set of expert agents across tools must hand-maintain the same prompt in six-plus incompatible file formats. This drifts, rots, and does not scale.

## Solution

Author each expert subagent **once** in a canonical Markdown + YAML format, then transpile to every tool's native format with a pure-TypeScript engine. The canonical definition is the single source of truth; each tool's output is generated and re-validated on every build.

## Scope (v1)

**In scope:**
- 134 domain-expert dev subagents across 10 categories (core dev, languages, infra, quality/security, data/AI, DX, specialized domains, business/product, meta-orchestration, research).
- Canonical schema (zod) + transpiler + 9 native emitters (claude, opencode, kiro, codex, factory, copilot, gemini, openhands, kilo) + 1 aggregate fallback (`AGENTS.md`) + opt-in rule emitters (cursor, windsurf, cline).
- `caesar` CLI: `build`, `validate`, plugin harness (`add`, `list`, `remove`), and legacy `install`.
- Per-category npm packages of prebuilt artifacts; two functional packages (`@caesar/agents-core`, `@caesar/cli`).
- A 6-gate per-agent quality pipeline with a measurable G4 rubric.

**Out of scope (v1):**
- Amp TS-plugin emitter (covered by `AGENTS.md`).
- Roo `.roomodes` (sunset 2026-05-15).
- Marketing/growth/sales agents.

## Principles

- **Author-once, transpile-many.** Canonical source → emitters → per-tool output. No hand-edited artifacts.
- **Validation at every boundary.** zod schema on input; per-tool output validator on every emitted file.
- **Poka-yoke security.** Read-only agents (auditors, reviewers, researchers) structurally cannot be granted `edit`/`write`/`bash`.
- **Expert depth over breadth.** Each agent is researched against current primary sources; quality is gated, not assumed.
- **Domain-generic naming.** Agent names carry no `caesar-` prefix so they read naturally in any tool; branding lives at the package boundary only.

## Quality bar

Every agent passes 6 gates: G1 research (primary-deep sources, current-year) → G2 draft → G3 self-review → G4 expert review (rubric ≥13/15) → G5 transpile+validate → G6 smoke test. See [`g1-research-playbook.md`](g1-research-playbook.md).

## Success criteria (met)

- `caesar validate --strict` → 134 agents valid, exit 0.
- `caesar build` → 1074 files across 10 targets (8 per-agent native outputs × 134, plus Kilo aggregate and shared `AGENTS.md`).
- Every category G4-passed (≥13/15, no failures); read-only poka-yoke verified on all auditor/research agents.
- Integration gate (transpile + smoke for all targets) green.

## Related docs

- [`system-architecture.md`](system-architecture.md) — how the engine works.
- [`tool-support-matrix.md`](tool-support-matrix.md) — the 14-tool target table.
- [`codebase-summary.md`](codebase-summary.md) — packages and key modules.
- [`code-standards.md`](code-standards.md) — conventions.
- [`project-roadmap.md`](project-roadmap.md) — phases and post-v1 backlog.
- [`tech-stack.md`](tech-stack.md) — locked stack decisions.
