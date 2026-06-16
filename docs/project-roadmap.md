# Project Roadmap — Caesar Harness Agent

## Status: v1 complete (2026-05-30)

134 agents across 10 categories, authored once and transpiling to 9 native targets plus shared `AGENTS.md`. `caesar validate --strict` green; full suite builds to 1074 files.

### Depth upgrade (2026-05-30, post-v1)

All 134 agents re-authored from the ~90-line "dead zone" to a **150–220 line expert band** (median 91 → 161; min 150, max 199, all in-band), filling the added lines with high-signal artifacts — decision tables, code/command snippets, numeric thresholds, behavioral traits, explicit cross-agent boundaries — not prose. Evidence: a blind, position-swapped, length-controlled measurement scored the re-authored prompts 25/25 vs the ~90-line baseline AND 25/25 vs a same-length filler control (depth, not length). Body soft-cap at 300 lines (non-fatal warn). A manifest-driven `agent-depth-budget.test.ts` enforces band + artifact-presence + permission/model-tier diff (no read-only auditor gained mutating tools). Spec captured in `g1-research-playbook.md` §2a/§4.


## Phases

| # | Phase | Status |
|---|---|---|
| 01 | Monorepo scaffold (pnpm, Biome, tsup, vitest) | ✅ done |
| 02 | Canonical schema + parser (zod, gray-matter, body validator) | ✅ done |
| 03 | Transpiler core + field mapping (model/permission/tools/targets) | ✅ done |
| 04 | Pilot emitters (claude + opencode) | ✅ done |
| 05 | Pilot agents (01-core-development) — proved the 6-gate pipeline | ✅ done |
| 06 | Remaining native emitters (kiro, codex, factory, copilot) | ✅ done |
| 07 | AGENTS.md fallback emitter + opt-in rule emitters | ✅ done |
| 08 | CLI — `build`, `validate`, `install` | ✅ done |
| 09 | Scale remaining 9 categories (134 agents total) | ✅ done |
| 10 | Packaging + docs + CI | ✅ done |
| 11 | Extended native emitters (gemini, openhands, kilo) — registry-based tier split | ✅ done |
| 12 | Agent Plugin Harness (`add`, `list`, `remove`, `caesar.lock`, global scope) | ✅ done |

## Agent inventory

| Category | Count |
|---|---:|
| 01 core-development | 7 |
| 02 language-specialists | 28 |
| 03 infrastructure | 18 |
| 04 quality-security | 15 |
| 05 data-ai | 19 |
| 06 developer-experience | 12 |
| 07 specialized-domains | 11 |
| 08 business-product | 8 |
| 09 meta-orchestration | 10 |
| 10 research-analysis | 6 |
| **Total** | **134** |

Applied during scale-out: **dedupe** (12 marketing-flavored agents not authored — owned by the separate marketing kit) and **fold-in** (Codex AI-governance/LLMOps roles → cat-05; internal-developer-platform roles → cat-03). No net-new categories.

## Quality results

- Every category G4-reviewed: all agents ≥13/15, zero failures.
- Read-only poka-yoke verified on all auditor/reviewer/research agents (cat-05 ×4, cat-07 hipaa, cat-08 license, cat-09 ×2, cat-10 ×6).
- 348 tests green; integration gate transpiles + smoke-tests all 134 agents to every target.

## Post-v1 backlog

| Item | Notes |
|---|---|
| Native **Antigravity** target | Gated on official confirmation of its subagent directory; Gemini CLI native ships now and serves the substrate Antigravity is built on. Antigravity stays on the `AGENTS.md`/`GEMINI.md` fallback meanwhile. |
| **Gemini full-fidelity** (tools + model) | Deferred — shipped **inherit-only** per decision (avoids unverified Gemini tool-ids the in-repo validator can't catch). Revisit if tool-ids get pinned. |
| Future **Kilo** per-agent format (`.kilo/agents/*.md`) | Has per-agent model (the legacy `.kilocodemodes` aggregate does not). Build if/when the legacy format is dropped. |
| **Amp** TS-plugin emitter | Amp ships via `AGENTS.md` (first-class native reader) now. Per-agent path = experimental `.amp/plugins/*.ts` via `experimental.createAgent` — **deferred/opt-in**: unstable API + codegen emitter class (typecheck/bun-smoke, not parse). Build only when `createAgent` stabilizes OR a user explicitly approves building on the experimental API. Spec in plan `260601-0007`. |
| **Nested per-category `AGENTS.md`** | Single index is fine at 134; revisit if it grows large |
| **Model-provider config presets** | Ship ready-made `modelOverrides` for non-Anthropic providers |
| **npm scope publish** | Verify `@caesar` availability; fallback scope if taken (release is approval-gated, not yet run) |
| Additional categories / agents | As demand emerges; each still passes the 6 gates |

## Notes on release

The release workflow exists but is **manual and approval-gated** (`workflow_dispatch`, `release` environment, dry-run by default). No package has been published; publishing requires explicit human action and a verified `@caesar` npm scope.
