# `@caesar/dsh-adapter`

Isolated adapter scaffold for **DeepSeek Harness (`@deepseek-ai/dsh`, Cordis architecture)**.

Kept separate from `@caesar/agents-core` so core transpilation stays dependency-free from Cordis/Schemastery.

## Usage (Codex / Universal Skills fallback)
Until Cordis plugin hooks are finalized, DeepSeek V4 Pro users can consume Caesar agents via:
1. Universal Agent Skills: `npx @caesar/cli add <source> --tool agent-skills`
2. Codex CLI (`config.toml`): `npx @caesar/cli add <source> --tool codex --tool codex-config`
