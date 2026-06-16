# Multi-Format Plugin Architecture

## Overview

Caesar Harness Agent supports three distribution formats for native plugin integration. This document describes the architecture and usage of each format.

## Triple-Layer Distribution

| Layer | Format | File | Use Case |
|-------|--------|------|----------|
| **CLI** | Canonical agents + `caesar` CLI | `packages/cli/` | Build and install for any tool |
| **Native Adapters** | Roo `.roomodes`, Cursor `.mdc`, Claude Plugin | Generated at build time | Direct IDE integration without CLI |
| **MCP Dynamic** | `caesar-coordinator` + stdio server | `packages/cli/src/mcp/` | Just-in-time agent summoning via MCP |

---

## Format 1: Claude Plugin (Marketplace)

Generates two files under `.claude-plugin/`:

### `marketplace.json`

The main registry file listing all agents. Claude's marketplace reads this to display available agents.

```json
{
  "schemaVersion": "1.0",
  "name": "Caesar Harness Agent",
  "description": "...",
  "agents": [
    {
      "id": "code-reviewer",
      "name": "Code Reviewer",
      "description": "Expert code review specialist...",
      "category": "01-core-development",
      "type": "subagent",
      "agentPath": ".claude/agents/code-reviewer.md"
    }
  ]
}
```

### `plugin.json`

The activation config referencing the manifest and agent directory.

```json
{
  "schemaVersion": "1.0",
  "manifestPath": ".claude-plugin/marketplace.json",
  "agentsDir": ".claude/agents"
}
```

### Emitter

- **Type:** AGGREGATE (all agents → one manifest)
- **Target:** `claude-plugin`
- **Registration:** `registerMultiFormatEmitters()`
- **Source:** `packages/agents-core/src/emitters/claude-plugin.ts`

---

## Format 2: Roo Code YAML (`.roomodes`)

Generates a single `.roomodes` file at the repo root with all agents as a `customModes:` YAML array.

Compatible with Roo Code (VS Code extension). Uses the same `customModes` structure as `.kilocodemodes` but targets a separate install.

### Structure

```yaml
customModes:
  - slug: code-reviewer
    name: Code Reviewer
    roleDefinition: |
      You are an expert code reviewer...
    whenToUse: After code is written or modified.
    description: Expert code review specialist...
    groups:
      - read
```

### Permission → Groups mapping

| Permission | Groups |
|-----------|--------|
| `read-only` | `[read]` |
| `edit` | `[read, edit]` |
| `full` | `[read, edit, command]` |

### Safety

The emitter applies markdown sanitization before YAML serialization:
- CRLF → LF normalization
- Trailing whitespace stripped per line
- YAML `aliasDuplicateObjects: false` prevents anchor/alias emission on large agent sets

### Emitter

- **Type:** AGGREGATE (all agents → one `.roomodes`)
- **Target:** `roo`
- **Registration:** `registerMultiFormatEmitters()`
- **Source:** `packages/agents-core/src/emitters/roo-yaml.ts`

---

## Format 3: Cursor MDC (`.cursor/rules/*.mdc`)

Generates per-agent `.mdc` files in `.cursor/rules/`. Each file is an "Agent-Requested" rule that Cursor loads by relevance based on the description.

### Structure

```
---
description: Expert code review specialist for quality, security...
alwaysApply: false
globs:
  - "**/*.ts"
  - "**/*.tsx"
---

## Role & Expertise
...
```

### Glob Derivation

The emitter derives file globs from language hints in the agent description and `when_to_use` field:

| Hint | Globs |
|------|-------|
| `TypeScript` | `**/*.ts`, `**/*.tsx` |
| `Rust` | `**/*.rs` |
| `Python` | `**/*.py` |
| `SQL` | `**/*.sql` |
| `test`, `spec` | `**/*.test.*`, `**/*.spec.*` |
| Generic | (none — relevance-based only) |

### Source Frontmatter

The loader strips source frontmatter before emitter runs. The body passed to the emitter contains only the prompt (no `---` block). The emitter adds its own clean frontmatter with no duplication risk.

### Emitter

- **Type:** PER-AGENT (one `.mdc` file per agent)
- **Target:** `cursor`
- **Registration:** `registerMultiFormatEmitters()`
- **Source:** `packages/agents-core/src/emitters/cursor-mdc.ts`

---

## Format 4: MCP Dynamic Mode (`caesar-coordinator`)

Instead of static file distribution, the Meta-Orchestrator enables **just-in-time agent summoning** via MCP protocol. This avoids dumping all 134+ agents into LLM context simultaneously.

### Architecture

```
LLM → MCP Client → caesar-coordinator MCP Server (stdio)
                       ├── search_agents(query) → Top 10 metadata
                       └── summon_agent(agent_id) → Full instructions
```

### MCP Server

- **Transport:** `stdio` (newline-delimited JSON-RPC 2.0)
- **Source:** `packages/cli/src/mcp/summon-server.ts`
- **Protocol:** MCP 2024-11-05

### Tools

#### `search_agents(query: string)`

Keyword search over agent metadata. Returns top 10 matches with id, name, description, category.

**Always call before `summon_agent`.** Never guess agent IDs.

```json
{
  "agents": [
    { "id": "code-reviewer", "name": "Code Reviewer", "description": "...", "category": "01-core-development" }
  ],
  "total": 1
}
```

#### `summon_agent(agent_id: string)`

Loads full agent instructions for the given `agent_id`. Returns content wrapped in `<agent_instructions>` XML tags for prompt injection safety.

**Security:** `agent_id` is validated by Zod regex `[a-z][a-z0-9-]*` — directory traversal (`../../../etc/passwd`) is rejected before any filesystem access.

### Starting the MCP Server

```bash
# Future CLI command (planned):
caesar mcp start --agents-root /path/to/project
```

For now, import and invoke `startMcpServer(agentsRoot)` from `packages/cli/src/mcp/summon-server.ts`.

### Agent

See `agents/09-meta-orchestration/caesar-coordinator.md` for the LLM-facing agent instructions that guide when and how to use the MCP tools.

---

## Registration

To enable all three new formats in a custom build:

```typescript
import { registerMultiFormatEmitters } from '@caesar/agents-core';

registerMultiFormatEmitters(); // registers: roo, cursor, claude-plugin
```

The `caesar build` CLI automatically includes all registered emitters.

---

## Compatibility Matrix

| Format | Claude Code | Roo Code | Kilo Code | Cursor | Via MCP |
|--------|------------|---------|-----------|--------|---------|
| `.claude/agents/*.md` | ✓ Native | — | — | — | — |
| `.claude-plugin/marketplace.json` | ✓ Marketplace | — | — | — | — |
| `.roomodes` | — | ✓ Native | ✓ Native | — | — |
| `.cursor/rules/*.mdc` | — | — | — | ✓ Native | — |
| `caesar-coordinator` MCP | ✓ Via tool | ✓ Via tool | ✓ Via tool | ✓ Via tool | ✓ Any MCP client |
