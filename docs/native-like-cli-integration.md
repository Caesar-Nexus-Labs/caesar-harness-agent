# Native-Like CLI Commands Guide

The Caesar CLI (`@caesar/cli`) provides a command `caesar alias` to set up shell wrappers that make executing specialized agents feel native in tools that might not have a built-in agent router.

## Setup
Run the following command to generate shell aliases for your installed tools:
```bash
npx @caesar/cli alias --setup
```

## How It Works
The command will modify your `~/.bashrc` or `~/.zshrc` (or PowerShell profile) to inject wrappers.
For example, it creates a wrapper function around the `gemini` CLI so that when you type:
```bash
gemini --agent typescript-pro
```
The wrapper transparently intercepts the `--agent` flag, loads `.gemini/agents/typescript-pro.md`, and feeds it into the target CLI as system instructions.

## Supported Alias Wrappers
- `claude` -> Configured natively via Marketplace (no wrapper needed)
- `gemini` -> Intercepts `--agent` or `-a`
- `cursor` -> Built-in `.mdc` support (no wrapper needed)
- `windsurf` -> Fallback interception (reads `AGENTS.md`)
