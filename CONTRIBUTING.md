# Contributing

Thanks for helping improve Caesar Harness Agent. Caesar-Harness-Agent serves as the definitive collection of harness subagents, specialized AI assistants designed for specific development tasks and native cross-platform coding agent outputs.

## Setup

```bash
pnpm install
pnpm build
pnpm test
pnpm validate
pnpm lint
```

Use Node.js 20 or newer and pnpm 10.33.2.

## Contribution scope

Good contributions include:

- new or improved canonical agents under `agents/`
- schema, parser, emitter, validator, or CLI fixes
- documentation fixes for supported tools and generated outputs
- tests that cover real behavior, not mocked shortcuts

Do not submit generated-only changes unless the source change that produced them is included. Generated output in `dist/` must come from canonical sources and build scripts.

## Agent quality pipeline

Every agent change follows the six gates documented in `docs/g1-research-playbook.md` and `docs/system-architecture.md`:

1. G1 Research — current primary sources plus corroborating engineering sources.
2. G2 Draft — canonical Markdown + YAML using `agents/_template/canonical-agent-template.md`.
3. G3 Self-review — routing, model tier, tool minimalism, and sibling-trigger overlap.
4. G4 Expert review — rubric-based review before generated output is trusted.
5. G5 Transpile + validate — `pnpm build` and `pnpm validate` must pass.
6. G6 Smoke test — emitted files must load and parse for every target.

## Public-surface hygiene

Public files must describe Caesar Harness Agent as original work. Do not include names of external prompt suites, study repositories, benchmark collections, or internal planning sources. Tool names are allowed when they are supported output targets.

## Pull request checklist

Before opening a pull request, run:

```bash
pnpm build
pnpm test
pnpm validate
pnpm lint
```

Also confirm:

- canonical source changes are included for generated artifacts
- package metadata still matches the repository license
- no secrets, credentials, local paths, or private planning notes are committed
- public documentation has no stale project names or internal-only links
