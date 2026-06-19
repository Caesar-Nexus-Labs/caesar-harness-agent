# Caesar Harness Agent System Architecture

## Overview

Caesar Harness Agent acts as a central transpilation engine. It allows maintainers to define expert coding subagents once in a canonical Markdown format (with YAML frontmatter) and safely emit native, cross-platform outputs for various AI coding tools (Claude Code, OpenCode, Cursor, Gemini, etc.).

## Core Architecture

The architecture is divided into the following layers:

### 1. Canonical Source (`agents/`)
Agents are defined in `.md` files grouped by category (e.g., `01-core-development`, `02-language-specialists`). These files contain:
- A YAML frontmatter describing the agent's identity, triggers, and supported tools.
- A strictly structured Markdown body (6 sections) containing instructions, rules, and domain context.

### 2. Core Engine (`@caesar/agents-core`)
The engine is responsible for parsing, validating, and transpiling the canonical sources.

- **Schema & Loader**: Parses the Markdown files and validates the frontmatter against a strict Zod schema (`CanonicalAgentSchema`).
- **Transpiler**: Orchestrates the conversion pipeline in-memory.
- **Emitters (The Adapter Pattern)**: Converts the canonical agent data into tool-specific structures.
  - **`core/`**: Defines the `Emitter` interfaces and base contracts.
  - **`adapters/`**: Implements platform-specific formatting (e.g., `claude/claude-emitter.ts`, `cursor/cursor-mdc.ts`). Each adapter adheres to the Open/Closed Principle, ensuring new tools can be added without modifying the core engine.
  - **`serializers/`**: Reusable modules for serializing data formats (e.g., Markdown Frontmatter, YAML, JSON), decoupling stringification logic from the platform adapters.
  - **`registry/`**: Dynamically registers and routes the appropriate adapters based on the target tool requested.
- **Output Validation**: Validates the transpiled structures against the expected schemas for each tool.
- **Write Outputs (`write-outputs.ts`)**: The isolated I/O sink. Safely flushes the transpiled artifacts to the `dist/` directory, preventing path traversal vulnerabilities.

### 3. CLI & Distribution (`@caesar/cli` & `scripts/`)
- **CLI Tools**: Commands like `build`, `validate`, and `install` provide the user interface for transpiling agents and installing them into local workspaces.
- **Distribution Registry (`assemble-category-packages.ts`)**: Automatically bundles the `dist/` output into 11 distinct NPM packages (categories) during release. It dynamically generates `package.json` manifests and `README.md` documentation for each category, enabling modular installation via `npm` or the `caesar add` command.

## Data Flow Pipeline

1. **Discover & Load**: Read canonical `.md` agent files.
2. **Parse & Validate**: Extract YAML frontmatter and validate via `zod`. Extract 6-section body.
3. **Transpile**: Pass the parsed `AgentData` into the core engine. The `Transpiler` fetches the required format adapter from the `Registry`.
4. **Emit**: The `Adapter` restructures the agent instructions and utilizes `Serializers` to format the output.
5. **Output Validation**: Validate the generated string or object.
6. **Flush to Disk**: Write the final file (e.g., `.claude/agents/*.md`, `.roomodes`) to the `dist/{tool}/` directory.
7. **Assemble**: Group `dist/` outputs by category and package them into publishable plugins.
