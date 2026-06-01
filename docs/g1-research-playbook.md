# G1 Research Playbook — Standard for Every Agent

**Status:** locked (validated via ck:predict --chain probe, 2026-05-30)
**Applies to:** EVERY agent authored in the suite (pilot Phase 05 + scale Phase 09).
**Purpose:** make G1 ("research") deterministic + deep enough that every agent reaches verifiable expert quality before G2 drafts the prompt. Closes the "shallow-prompt-at-scale" risk.

> One `researcher` runs this playbook per agent (no batching). Output = one G1 report consumed by G2. G2 only TRANSFORMS the report into a prompt — it does not invent from a blank page.

---

## 0. Locked decisions (from validation interview)

| # | Decision | Value |
|---|---|---|
| Q-A | Source philosophy | **Primary-deep.** Official docs > primary engineering sources (maintainer talks, authoritative books/guides) > corroborating secondary sources. Content-farm/SEO **excluded**. Depth over breadth. |
| Q-B | "Expert reached" definition | **Measurable rubric** (checklist + score). See §4. |
| Q-C | Research unit | **1 researcher / 1 agent** for ALL ~150 agents (no batching). |
| Q-D | Depth tiering | **Uniform** — every agent same depth bar. (Accept higher token cost; see §6.) |

**Token-cost note (explicit trade-off):** 1 researcher/agent × ~150 + uniform depth = highest token spend (~15x/agent per standards §5). Accepted in exchange for uniform expert quality. Mitigation: cap tool-calls/researcher (§3), parallelize G1 across agents (read-only, safe).

---

## 1. Source whitelist & ranking (Q-A)

Research MUST draw from, in priority order:

1. **Official/primary docs** for the domain (language spec, framework docs, RFCs, standards bodies — e.g. OWASP for security, ECMA/TC39 for JS, PEP for Python). Use `context7` / `docs-seeker` skill for current library docs.
2. **Primary engineering sources** — official engineering blogs, maintainer talks, recognized authoritative books/guides.
3. **Corroborating secondary sources** — independent write-ups that confirm or extend a primary claim (used to cross-check, never as the sole basis).

**Excluded:** SEO content farms, AI-generated listicles, low-authority aggregators (standards §7 — agents otherwise bias toward content farms).

**Currency rule:** for FAST-MOVING domains (security, framework versions, cloud, AI/LLM tooling) MUST verify against current year (2026) via web search — do NOT answer from memory. For STABLE domains (algorithms, design patterns, data structures) primary docs suffice without recency search.

**Minimum bar to pass G1:** ≥3 sources cited (≥1 official doc + ≥2 corroborating primary/engineering sources) per agent. Mark every claim fact vs inference.

---

## 2. Required G1 output contract — the 5 blocks (Q-B input → G2)

Every G1 report MUST produce these 5 blocks, mapping 1:1 to the 6 mandatory prompt sections G2 will write:

| G1 block | Feeds prompt section | Content |
|---|---|---|
| **B1 — Domain expertise (SOTA 2026)** | §1 Role+expertise, §2 When-to-use | What a top-tier expert in THIS role actually knows/does in 2026. Seniority markers, current tools, key sub-skills. |
| **B2 — Canonical workflow** | §3 Numbered workflow | The ordered procedure an expert follows ("When invoked: 1…2…3…"). Concrete steps, not vague. |
| **B3 — Checklist + heuristics** | §4 Checklist/heuristics | The quality bars + rules-of-thumb the expert applies. ≥5 concrete items. Heuristics not rigid rules (standards §4). |
| **B4 — Boundaries + anti-patterns** | §6 Boundaries | What this agent MUST NOT do; scope edges; failure modes; common mistakes to avoid. |
| **B5 — Distinctiveness delta** | §5 Output contract + routing | How a top-tier expert in THIS role expresses it + how OUR agent will be sharper (tighter workflow, cleaner output, clearer boundaries) than a generic baseline. Proposed output structure. Proposed `description` trigger phrases (non-overlapping with siblings). |

Plus report header: **agent name, 1-line scope, tool-minimalism recommendation** (which canonical tools + permission tier this role needs, standards §2), **model tier** (fast/balanced/top rationale).

**Report location:** `{plan-dir}/reports/researcher-{date}-{category}-{agent}.md`. ≤150 lines. End with **Status:** line + Sources list (grouped: official / primary / corroborating).

### 2a. Depth band + signal budget (merged from depth-upgrade pilot, Phase-B GO 2026-05-30)

The G2 draft body (markdown after frontmatter) targets a **150–220 line band, hard max 300** (soft-warned, never build-failed). ~90-line bodies are a "dead zone" — too long for clean-minimalist, too short for real expert taxonomy. Spend the added lines as:
- **~60%** decisions / boundaries / behavioral traits (opinionated defaults, cross-agent deferrals, named trade-offs)
- **~40%** concrete artifacts (decision tables, code/command snippets, numeric thresholds, worked examples)
- **~0%** prose filler

**Artifacts are domain-conditional**, not a blanket quota — "no table where none adds signal" is allowed with a one-line G4-reviewed justification (forced quotas recreate the flat noun-list failure: length without decisions). **Hard-rule cap ≤~30–50** discrete MUST-rules/agent (instruction-complexity cliff). Use **plain imperatives** — no "CRITICAL/MUST/ALWAYS" force language (Claude 4.x overtriggers). Pilot evidence: a blind, position-swapped, length-controlled judge scored the re-authored prompts 25/25 vs the ~90-line baseline AND 25/25 vs a same-length filler control (depth, not length).

---

## 3. Researcher execution rules

- **1 researcher per agent.** Prompt includes: agent name, role scope, this playbook path, source whitelist (§1), the 5-block output contract (§2), reports path, env details.
- **Tool-call budget:** ~6–10 calls/agent (enough for ≥3 sources: ≥1 official + ≥2 corroborating + currency check). Prevents runaway token spend while hitting the §1 minimum.
- **Parallelize G1 across agents** (read-only = safe per orchestration-protocol). Serialize G2+ (writes).
- **Subagents do not spawn subagents** — main orchestrator dispatches all G1 researchers.
- Use `context7`/`docs-seeker` for official docs; web search for current-year currency checks on fast-moving domains.

---

## 4. G4 expert-review rubric (Q-B — makes "expert" measurable)

G4 (`code-reviewer`) scores each drafted agent against this rubric. **PASS = all checklist items ✓ AND total ≥ 13/15.** Else loop back to G2 (cap 3 loops, then escalate).

**Hard checklist (binary — ALL must be ✓):**
- [ ] All 6 prompt sections present + non-empty
- [ ] Body traces to G1 report (no invented domain claims)
- [ ] ≥3 sources cited in the backing G1 report (≥1 official + ≥2 corroborating)
- [ ] ≥5 concrete heuristics/checklist items in §4
- [ ] Boundaries section states explicit MUST-NOT items
- [ ] `description` has proactive trigger phrases, NO overlap with sibling agents in same category
- [ ] Tools = minimal for role (standards §2); permission tier matches (read-only/edit/full)
- [ ] Domain currency verified for fast-moving domains (2026)
- [ ] Body in 150–220 line band (or on lean-exception allowlist with one-line justification); ≤300 hard max
- [ ] ≥1 concrete artifact where domain-relevant (decision table / code-command snippet / numeric thresholds / worked example), or justified absent
- [ ] ≤~30–50 discrete hard rules (no instruction-complexity cliff)
- [ ] Plain imperatives — no "CRITICAL/MUST/ALWAYS" force language; critical rules at top/bottom, not buried mid-prompt

**Scored dimensions (1–5 each, need ≥13/15 total):**
- **Depth** (1–5): domain expertise is genuinely senior-level, not generic
- **Actionability** (1–5): workflow + output contract are concrete + executable
- **Distinctiveness** (1–5): demonstrably sharper than a generic baseline (B5 delta realized); cite the specific concrete artifact(s) added

---

## 5. Where this fits the 6-gate pipeline

```
G1 researcher  → THIS PLAYBOOK → 5-block report (1/agent, parallel)   ← upgraded spec
G2 author      → transform 5 blocks → canonical MD+YAML (6 sections)  (serial)
G3 self-review → tool-minimalism, model routing, desc routing, sibling overlap
G4 code-reviewer → THIS RUBRIC (§4) → pass ≥13/15 + checklist, loop≤3
G5 transpile   → all emitters + per-tool validators
G6 tester      → smoke-test (load+parse)
```

---

## 6. Anti-patterns this playbook prevents

- "Research nát Google" pulling SEO/content-farm noise → §1 whitelist + ranking.
- Shallow prompts at 150-agent scale → §2 mandatory 5 blocks + §4 rubric.
- Inconsistent G1 output → G2 drift → §2 fixed contract.
- "Expert" as subjective vibe → §4 measurable rubric.
- Outdated agents at birth → §1 currency rule.
- Cloning any external prompt verbatim (IP risk + rarely the strongest form) → B5 requires a DELTA (be sharper than a generic baseline, don't clone).

---

## Unresolved Questions
1. Gold-standard anchor: build `code-reviewer` first as the reference exemplar all others compare against? (Recommended yes — pilot Phase 05 produces it.) Confirm during Phase 05.
2. Tool-call budget §3 (~6–10) may need tuning after pilot measures real G1 cost — revisit after Phase 05.