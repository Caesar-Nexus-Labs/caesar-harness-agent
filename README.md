<div align="center">

# Caesar Harness Agent

### The definitive collection of harness subagents, specialized AI assistants designed for specific development tasks and native cross-platform coding agent outputs

![License: GPL v3](https://img.shields.io/badge/license-GPLv3-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10.33.2-F69220?logo=pnpm&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=nodedotjs&logoColor=white)
![Outputs](https://img.shields.io/badge/outputs-12_native_%2B_AGENTS.md-6B46C1)

**Write expert coding subagents once. Emit native agent outputs everywhere.**

Caesar-Harness-Agent serves as the definitive collection of harness subagents, specialized AI assistants designed for specific development tasks and native cross-platform coding agent outputs.

</div>

## Why Caesar Harness Agent

Every AI coding tool invented its own agent file format. Maintaining the same backend reviewer, Rust expert, or security auditor prompt across multiple tools by hand creates drift and stale behavior.

Caesar Harness Agent keeps one canonical Markdown + YAML definition per expert agent, then transpiles it into each tool's native format with schema validation on every build. One source of truth. No per-tool copy-paste. No prompt drift.

## Installation Methods

### Method 1: Automatic via Caesar CLI (Recommended)
Add agent plugins directly using `npx @caesar/cli`:
```bash
# Add to current project (all supported tools)
npx @caesar/cli add @caesar/lang

# Add for specific tools only
npx @caesar/cli add @caesar/data-ai --tool claude --tool opencode

# Add globally (for tools that support global agent directories)
npx @caesar/cli add @caesar/core-dev --global
```

Manage your installed plugins:
```bash
npx @caesar/cli list
npx @caesar/cli list --global
npx @caesar/cli remove @caesar/lang
```

Plugins support local paths, npm packages, and GitHub repositories:
```bash
npx @caesar/cli add github:user/custom-agents
```

### Method 2: Project devDependency & Version Pinning
Manage plugin versions within your project's package lifecycle:
1. Install the category plugin:
   ```bash
   pnpm add -D @caesar/lang
   # or npm install --save-dev @caesar/lang
   ```
2. Run the local CLI to link artifacts:
   ```bash
   npx caesar add @caesar/lang
   ```

### Method 3: Automated via postinstall Hook
To ensure all developers and CI pipelines have the correct agent configs synced:
Add this to your project's `package.json`:
```json
{
  "scripts": {
    "postinstall": "caesar add @caesar/lang"
  }
}
```

### Method 4: Manual Copy-Paste (Direct Folder Mapping)
If you prefer not to use the CLI, you can install the npm package or clone the repository, then copy files manually:

| Tool | Source Path (in `@caesar/{category}/dist/`) | Target Path (Project Root) |
| :--- | :--- | :--- |
| **Claude Code** | `claude/.claude/agents/*.md` | `.claude/agents/` |
| **OpenCode** | `opencode/.opencode/agents/*.md` | `.opencode/agents/` |
| **Kiro** | `kiro/.kiro/agents/*.json` | `.kiro/agents/` |
| **Codex** | `codex/.codex/agents/*.toml` | `.codex/agents/` |
| **Factory / Droid** | `factory/.factory/droids/*.md` | `.factory/droids/` |
| **GitHub Copilot** | `copilot/.github/agents/*.agent.md` | `.github/agents/` |
| **Gemini CLI** | `gemini/.gemini/agents/*.md` | `.gemini/agents/` |
| **OpenHands** | `openhands/.agents/skills/*` | `.agents/skills/` |
| **Kilo Code** | `kilo/.kilocodemodes` | `.kilocodemodes` |
| **Roo Code** | `roo/.roomodes` | `.roomodes` |
| **Cursor** | `cursor/.cursor/rules/*.mdc` | `.cursor/rules/` |
| **Claude Marketplace** | `claude-plugin/.claude-plugin/marketplace.json` | `.claude-plugin/` |
| **Fallbacks** | `agents-md/AGENTS.md` | `AGENTS.md` |

## Interactive Auto-Detection

When you run `caesar add <source>` without specifying the `--tool` flag, the CLI automatically detects which AI coding tools are configured on your machine.
- **Interactive Terminal (TTY)**: The CLI will scan your workspace and global directories, and ask you:
  ```text
  Detected active tools: claude, opencode. Install for these? (Y/n): 
  ```
  If you accept, it installs only for those tools. If you decline, it will let you enter a custom comma-separated list of tools.
- **Non-Interactive (CI/CD / Postinstall)**: The CLI will automatically detect active tools and install only for them. If no active tools are found, it acts as a **safe no-op** to prevent writing unwanted folders and polluting your workspace.

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
| Roo Code | `.roomodes` | native aggregate output |
| Cursor | `.cursor/rules/*.mdc` | native per-agent MDC |
| Claude Marketplace | `.claude-plugin/marketplace.json` | native aggregate output |
| Cursor, Windsurf, Cline, Antigravity, Amp | shared `AGENTS.md` routing index | fallback |

Full matrix and per-tool limits: [`docs/tool-support-matrix.md`](docs/tool-support-matrix.md).

## Target Tools Configuration & Usage

Once the agents are copied or installed into their respective target paths, here is how you invoke and use them in each supported tool. For a native-like installation flow, configure CLI shell wrappers by running `caesar alias` (see the [Native-Like CLI Commands Guide](docs/native-like-cli-integration.md)).

### 1. Claude Code
- **Path**: Local `.claude/agents/` or Global `~/.claude/agents/`
- **Native-Like Installation**:
  - Add registry: `claude plugin marketplace add Caesar-Nexus-Labs/caesar-harness-agent`
  - Install agent: `claude plugin install <plugin-name>`
- **Usage**: Run `claude`. Inside the Claude interactive terminal, type `/` to see the autocomplete list of agents, or type `/<agent-slug>` (e.g., `/typescript-pro`) to activate a specific subagent.

### 2. OpenCode
- **Path**: Local `.opencode/agents/` or Global `~/.opencode/agents/`
- **Native-Like Installation**:
  - Add source: `opencode subagent add Caesar-Nexus-Labs/caesar-harness-agent`
  - Remove subagent: `opencode subagent remove <subagent-name>`
- **Usage**: OpenCode automatically detects agents in these directories. Run `opencode` CLI or open the editor interface, and select the subagent from the session setup menu or invoke them via standard chat.

### 3. Kiro
- **Path**: Local `.kiro/agents/` or Global `~/.kiro/agents/`
- **Native-Like Installation**:
  - Install source/agent: `kiro agent install Caesar-Nexus-Labs/caesar-harness-agent`
- **Usage**: Kiro parses these JSON agent manifests. Run `kiro` CLI or use the Kiro IDE/UI mode selector, and specify the agent by name.

### 4. Codex
- **Path**: Local `.codex/agents/` or Global `~/.codex/agents/`
- **Usage**: Codex loads TOML developer instructions. Run `codex` CLI or launch the Codex web IDE; it automatically scans `.codex/agents/` to make the custom agent modes available.

### 5. Factory / Droid
- **Path**: Local `.factory/droids/` or Global `~/.factory/droids/`
- **Native-Like Installation**:
  - Add source/agent: `factory agent add Caesar-Nexus-Labs/caesar-harness-agent`
- **Usage**: Droids are selected in the Factory build execution interface to automate specific development loops. You can run the `factory` CLI tool or access the web build dashboard.

### 6. GitHub Copilot / VS Code
- **Path**: Local `.github/agents/`
- **Native-Like Installation**:
  - Add source/agent: `copilot agent add Caesar-Nexus-Labs/caesar-harness-agent`
- **Usage**: Copilot in VS Code reads these YAML definitions. In the Copilot Chat view, type `@agent-slug` (e.g., `@typescript-pro`) to route your conversation and context to the specialized agent.

### 7. Gemini CLI & Antigravity (Agy)
- **Path**: Local `.gemini/agents/` or Global `~/.gemini/agents/`
- **Usage**: Antigravity is built on top of the Gemini CLI substrate and natively parses files in `.gemini/agents/`. Run the `gemini` or `antigravity` CLI tool and target the mode using the mode picker or session arguments. The IDE extensions (such as Gemini Code Assist) also read from the workspace environment dynamically.

### 8. OpenHands
- **Path**: Local `.agents/skills/` (folder-per-skill format)
- **Native-Like Installation**:
  - Install source/agent: `openhands agent install Caesar-Nexus-Labs/caesar-harness-agent`
- **Usage**: OpenHands automatically injects these folders as workspace skills. Run OpenHands web IDE or its CLI tool; agents will invoke these skills programmatically when appropriate.

### 9. Kilo Code
- **Path**: Local `.kilocodemodes` (single YAML file)
- **Usage**: Kilo reads this file to configure its custom modes. The modes list will be displayed in the Kilo UI dropdown.

### 10. Roo Code
- **Path**: Local `.roomodes` (single YAML file)
- **Usage**: Roo Code reads this file to configure its custom modes. You can select the custom mode from the mode dropdown in the sidebar in VS Code.

### 11. Cursor (Native MDC Rules)
- **Path**: Local `.cursor/rules/`
- **Usage**: Cursor loads per-agent `.mdc` files. The rules are applied automatically based on the glob patterns defined in the MDC frontmatter, or you can mention them in chat using `@rule-name`. Open the workspace using the `cursor .` CLI command or the editor UI.

### 12. Claude Plugin Marketplace
- **Path**: Local `.claude-plugin/`
- **Usage**: Configures the local registry for custom plugin distributions. Run your local marketplace server to serve these to Claude.

### 13. Fallbacks (Windsurf, Cline, Amp)
- **Path**: Local `AGENTS.md`
- **Usage**: These tools do not support isolated agent folders natively, so they read the `AGENTS.md` file as shared repository-level instructions. Open the workspace using the `windsurf .` CLI command or the IDE interface. The instructions guide the fallback tools on role discovery and system boundaries. Cline also checks `.clinerules/` for custom instruction files.


## Expert coding agents and prompt library

Caesar-Harness-Agent currently ships **134 expert coding agents** across 10 categories.

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

For tools that read repository-level instructions instead of tool-native agent files, Caesar Harness Agent emits a shared `AGENTS.md` routing index. That fallback keeps role discovery consistent, but native targets remain the preferred path when a tool supports isolated agents, permissions, or model routing.

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

### What are expert coding subagents?

They are specialized agent definitions that tools can route to for focused work such as code review, infrastructure, data engineering, or security analysis.

### Can these agents work natively in OpenCode or Codex?

Not directly as the same file. Caesar Harness Agent solves that by compiling one canonical source into native OpenCode, Codex, and other target formats.

### What is AGENTS.md used for?

`AGENTS.md` is the shared repository instruction index for compatible tools and fallback routing. It is useful for consistency, but it does not replace native tool support where native agents are available.

### How does Caesar Harness Agent prevent prompt drift?

The canonical agent is the only source that maintainers edit. Generated outputs are rebuilt and validated instead of hand-maintained per tool.

### Is Caesar Harness Agent a prompt marketplace?

No. It is a harness, transpiler, and curated software-engineering agent library for maintainers who want repeatable multi-tool outputs.

## Community

- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [License](LICENSE)

## License

GPL-3.0-only. See [LICENSE](LICENSE).
