# Codebase Summary: Caesar Harness Agent

## Directory Structure

```text
Caesar-Harness-Agent/
├── agents/                 ← Canonical Markdown agents (source of truth)
├── packages/
│   ├── agents-core/        ← Core transpilation engine
│   │   ├── src/
│   │   │   ├── emitters/   ← Adapters, Core, Registry, and Serializers
│   │   │   ├── loader/     ← Markdown parsing & Zod validation
│   │   │   ├── validation/ ← Output schema validators per tool
│   │   │   ├── transpile.ts← Core in-memory transpiler loop
│   │   │   └── write-outputs.ts ← Isolated I/O filesystem sink
│   ├── cli/                ← Caesar CLI for build, validate, install
│   └── categories/         ← Auto-generated NPM plugin packages
├── scripts/                ← Build & Assembly scripts
└── docs/                   ← Project documentation
```

## Key Components

### 1. The Transpiler Engine (`packages/agents-core/src/transpile.ts`)
The transpiler takes canonical agent objects (loaded from `agents/`) and passes them through a registry of format adapters. The process is completely decoupled from the file system.

### 2. The Emitters Adapter Pattern (`packages/agents-core/src/emitters/`)
Emitters have been strictly refactored into:
- **Core**: Contains `emitter-interface.ts` defining the abstraction.
- **Adapters**: Target-specific implementations (e.g., `claude/`, `cursor/`, `roo/`).
- **Serializers**: Utilities for stringifying specific formats (Markdown Frontmatter, JSON, YAML) independently of the adapter logic.
- **Registry**: Factory pattern handlers for registering native, extended, multi-format, and fallback emitters.

### 3. The CLI (`packages/cli/`)
Provides the terminal interface:
- `build`: Initiates the transpilation loop and flushes to `dist/`.
- `validate`: Runs dry-run transpilation to check schemas without I/O.
- `install` / `add`: Retrieves remote plugins from npm or GitHub and installs them natively.
- `alias`: Wraps platform native CLI commands to intercept agent executions.

### 4. Distribution Scripts (`scripts/`)
- `assemble-category-packages.ts`: Collects the `dist/` outputs and structures them into publishable npm packages representing distinct domain categories (e.g., `@caesar/lang`, `@caesar/marketing`). It also automatically generates the `package.json` manifest and `README.md` for each category plugin.
