# Tool Support Matrix

Caesar Harness Agent transpiles canonical agents into native formats for various AI coding tools. Below is the support matrix.

| Tool | Format Output | Tier | Routing Pattern |
|---|---|---|---|
| **Claude Code** | `.claude/agents/*.md` | Native | Local directory loading via `/` autocomplete |
| **OpenCode** | `.opencode/agents/*.md` | Native | Local directory session loader |
| **Kiro** | `.kiro/agents/*.json` | Native | Local directory JSON manifests |
| **Codex** | `.codex/agents/*.toml` | Native | TOML developer instructions |
| **Factory / Droid** | `.factory/droids/*.md` | Native | MD execution interface |
| **GitHub Copilot / VS Code** | `.github/agents/*.agent.md` | Native | `@agent` command routing in chat |
| **Gemini CLI** | `.gemini/agents/*.md` | Native | Workspace directory lookup |
| **OpenHands** | `.agents/skills/*/SKILL.md` | Native | Auto-injected workspace skills (legacy alias) |
| **Universal Agent Skills** | `.agents/skills/*/SKILL.md` | Native | Progressive-disclosure `agentskills.io` standard (Claude, Cursor, Codex, Copilot, Gemini, Qoder, Qwen) |
| **Kilo Code** | `.kilocodemodes` | Native Aggregate | Single YAML UI dropdown parsing |
| **Roo Code** | `.roomodes` | Native Aggregate | Single YAML UI dropdown parsing |
| **Cursor** | `.cursor/agents/*.md` | Native | Isolated native subagents (`readonly`, `is_background`, `model`) |
| **Cursor MDC (Legacy)** | `.cursor/rules/*.mdc` | Native MDC (opt-in) | Automatic glob-based rules application |
| **Qoder (IDE / CLI)** | `.qoder/agents/*.md` | Native | Local directory subagents (`permissionMode`, `effort`, `mcpServers`) |
| **Qwen Code** | `.qwen/skills/*/SKILL.md` + `qwen-extension.json` | Native | Progressive-disclosure skills with lifecycle hooks + extension bundle |
| **Gemini Extension** | `gemini-extension.json` | Native Aggregate | Extension manifest bundling `.gemini/agents/` and `.agents/skills/` |
| **Codex Config** | `.codex/config.toml` | Native Aggregate | `[agents.<slug>]` + `prompt_file` + `sandbox_mode` |
| **Goose** | `.goose/agents/*.md` | Native | Per-agent Goose markdown with MCP server bindings |
| **A2A Agent Card** | `.well-known/agent-card.json` | Standard (A2A v1.0) | Agent2Agent discovery card listing all skills |
| **Claude Plugin Marketplace**| `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`, `hooks/hooks.json`, `.mcp.json` | Native Aggregate | Full Claude Plugin v2 bundle |
| **Universal Repo Index** | `AGENTS.md` | Standard (AAIF) | Universal repository routing index (Claude, Codex, Cursor, OpenCode, Gemini, Windsurf, Cline, Amp) |

*Note: Native Tier implies that the tool can natively isolate the subagent's prompt and toolset, instead of mixing it indiscriminately into a single generic repository file.*
