<div align="center">

# CaesarAgent

### Author-once AI agent harness for cross-platform AI coding agents

![License: GPL v3](https://img.shields.io/badge/license-GPLv3-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10.33.2-F69220?logo=pnpm&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=nodedotjs&logoColor=white)
![Outputs](https://img.shields.io/badge/outputs-9_native_%2B_AGENTS.md-6B46C1)

**Write Claude Code subagents once. Emit native agent outputs everywhere.**

CaesarAgent is an AI agent harness for Claude Code subagents, AGENTS.md-compatible tools, and native agent outputs across the modern AI coding stack.

</div>

## Why CaesarAgent

Every AI coding tool invented its own agent file format. Maintaining the same backend reviewer, Rust expert, or security auditor prompt across multiple tools by hand creates drift and stale behavior.

CaesarAgent keeps one canonical Markdown + YAML definition per expert agent, then transpiles it into each tool's native format with schema validation on every build. One source of truth. No per-tool copy-paste. No prompt drift.

## Quickstart

```bash
pnpm install
pnpm build
pnpm validate
```

After building the CLI, call the built entrypoint and install one category into a target project:

```bash
node packages/cli/dist/index.js build
node packages/cli/dist/index.js install 05-data-ai --tool claude --dest <target-project>     # → .claude/agents/*.md
node packages/cli/dist/index.js install 03-infrastructure --tool codex --dest <target-project>
node packages/cli/dist/index.js validate --strict
```

Replace `<target-project>` with the project directory that should receive the generated agent files. Category accepts `NN`, `NN-name`, or `name` (for example: `05`, `05-data-ai`, `data-ai`).

## Native agent outputs

| Tool | Output | Tier |
|---|---|---|
| Claude Code | `.claude/agents/*.md` | native |
| OpenCode | `.opencode/agents/*.md` | native |
| Kiro | `.kiro/agents/*.json` | native |
| Codex | `.codex/agents/*.toml` | native |
| Factory / Droid | `.factory/droids/*.md` | native |
| GitHub Copilot / VS Code | `.github/agents/*.agent.md` | native |
| Gemini CLI | `.gemini/agents/*.md` | native, inherit-only emit |
| OpenHands | `.agents/skills/*/SKILL.md` | native skill output |
| Kilo Code | `.kilocodemodes` | native aggregate output |
| Cursor, Windsurf, Cline, Antigravity, Amp | shared `AGENTS.md` routing index | fallback |
| Roo Code | not emitted | skipped |

Full matrix and per-tool limits: [`docs/tool-support-matrix.md`](docs/tool-support-matrix.md).

## Expert coding agents and prompt library

CaesarAgent currently ships **134 expert coding agents** across 10 categories.

| # | Category | Count | Examples |
|---|---|---:|---|
| 01 | core-development | 7 | backend-developer, api-designer, microservices-architect |
| 02 | language-specialists | 28 | typescript-pro, rust-engineer, python-pro, flutter-expert |
| 03 | infrastructure | 18 | kubernetes-specialist, terraform-engineer, sre-engineer |
| 04 | quality-security | 15 | code-reviewer, security-auditor, penetration-tester |
| 05 | data-ai | 19 | ai-engineer, ml-engineer, llm-architect, eval-engineer |
| 06 | developer-experience | 12 | refactoring-specialist, mcp-developer, build-engineer |
| 07 | specialized-domains | 11 | blockchain-developer, fintech-engineer, embedded-systems |
| 08 | business-product | 8 | product-manager, business-analyst, technical-writer |
| 09 | meta-orchestration | 10 | multi-agent-coordinator, context-manager, policy-guardrail-designer |
| 10 | research-analysis | 6 | research-analyst, search-specialist, first-principles-thinking |

Each category can ship as its own npm package of prebuilt artifacts (`@caesar/lang`, `@caesar/infra`, and others) so projects install only the roles they need.

## How it works

```text
agents/{NN-category}/{agent}.md   canonical source (Markdown + YAML)
        │
        ▼  @caesar/agents-core  (schema → transpiler → emitters)
        │
        ▼  per-tool output validators
        │
        ▼
dist/{tool}/…   native files for each tool   +   dist/agents-md/AGENTS.md
```

Architecture detail: [`docs/system-architecture.md`](docs/system-architecture.md).

## Packages

| Package | Purpose |
|---|---|
| `@caesar/agents-core` | Canonical schema, transpiler engine, emitters, and output validators |
| `@caesar/cli` | The `caesar` CLI: `build`, `validate`, and `install` |
| `@caesar/{category}` | Prebuilt agent artifacts per category, generated from `dist/` at release |

## AGENTS.md fallback

For tools that read repository-level instructions instead of tool-native agent files, CaesarAgent emits a shared `AGENTS.md` routing index. That fallback keeps role discovery consistent, but native targets remain the preferred path when a tool supports isolated agents, permissions, or model routing.

## Contributing a new agent

Every agent goes through a 6-gate quality pipeline (see [`docs/g1-research-playbook.md`](docs/g1-research-playbook.md) and [`docs/system-architecture.md`](docs/system-architecture.md)):

1. **G1 Research** — current primary sources plus corroborating engineering sources.
2. **G2 Draft** — copy [`agents/_template/canonical-agent-template.md`](agents/_template/canonical-agent-template.md); fill the frontmatter superset and all 6 body sections.
3. **G3 Self-review** — tool minimalism, model tier, crisp routing, no sibling-trigger overlap.
4. **G4 Expert review** — measurable rubric, read-only poka-yoke for auditors.
5. **G5 Transpile + validate** — `caesar validate --strict` must pass.
6. **G6 Smoke test** — emitted files load and parse for every target.

Local validation:

```bash
pnpm build
pnpm test
pnpm validate
pnpm lint
```

## FAQ

### What are Claude Code subagents?

They are specialized agent definitions that Claude Code can route to for focused work such as code review, infrastructure, data engineering, or security analysis.

### Can Claude Code agents work in OpenCode or Codex?

Not directly as the same file. CaesarAgent solves that by compiling one canonical source into native OpenCode, Codex, and other target formats.

### What is AGENTS.md used for?

`AGENTS.md` is the shared repository instruction index for compatible tools and fallback routing. It is useful for consistency, but it does not replace native tool support where native agents are available.

### How does CaesarAgent prevent prompt drift?

The canonical agent is the only source that maintainers edit. Generated outputs are rebuilt and validated instead of hand-maintained per tool.

### Is CaesarAgent a prompt marketplace?

No. It is a harness, transpiler, and curated software-engineering agent library for maintainers who want repeatable multi-tool outputs.

## Community

- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [License](LICENSE)

## License

GPL-3.0-only. See [LICENSE](LICENSE).
