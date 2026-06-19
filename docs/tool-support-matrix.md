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
| **OpenHands** | `.agents/skills/*/SKILL.md`| Native | Auto-injected workspace skills |
| **Kilo Code** | `.kilocodemodes` | Native Aggregate | Single YAML UI dropdown parsing |
| **Roo Code** | `.roomodes` | Native Aggregate | Single YAML UI dropdown parsing |
| **Cursor** | `.cursor/rules/*.mdc` | Native MDC | Automatic glob-based rules application |
| **Claude Plugin Marketplace**| `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json` | Native Aggregate | Plugin registry index & configuration |
| **Windsurf / Cline / Amp** | `AGENTS.md` | Fallback | Shared generic repository routing index |

*Note: Native Tier implies that the tool can natively isolate the subagent's prompt and toolset, instead of mixing it indiscriminately into a single generic repository file.*
