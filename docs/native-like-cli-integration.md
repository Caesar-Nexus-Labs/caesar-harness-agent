# Native-Like CLI Commands & Shell Integration

This guide explains how to set up shell wrappers that allow you to use the target tools' native plugin/agent installation syntax (such as `claude`, `opencode`) directly from your terminal.

## 1. How It Works

When you type a third-party plugin/agent command, the shell wrapper intercepts the execution and forwards the equivalent command to `caesar add` or `caesar remove`:

* `claude plugin marketplace add Caesar-Nexus-Labs/caesar-harness-agent` → `caesar add Caesar-Nexus-Labs/caesar-harness-agent --tool claude`
* `claude plugin install <plugin-name>` → `caesar add <plugin-name> --tool claude`
* `opencode subagent add Caesar-Nexus-Labs/caesar-harness-agent` → `caesar add Caesar-Nexus-Labs/caesar-harness-agent --tool opencode`
* `opencode subagent remove <subagent-name>` → `caesar remove <subagent-name>`
* `kiro agent install Caesar-Nexus-Labs/caesar-harness-agent` → `caesar add Caesar-Nexus-Labs/caesar-harness-agent --tool kiro`
* `copilot agent add Caesar-Nexus-Labs/caesar-harness-agent` → `caesar add Caesar-Nexus-Labs/caesar-harness-agent --tool copilot`
* `factory agent add Caesar-Nexus-Labs/caesar-harness-agent` → `caesar add Caesar-Nexus-Labs/caesar-harness-agent --tool factory`
* `openhands agent install Caesar-Nexus-Labs/caesar-harness-agent` → `caesar add Caesar-Nexus-Labs/caesar-harness-agent --tool openhands`

Commands unrelated to plugin or subagent management (e.g., `claude dev`, `opencode start`) are forwarded directly to the original tool with zero overhead (latency < 10ms) and no risk of infinite recursion.

---

## 2. Automatic Setup

To automatically detect your current active shell and write the wrapper configuration to your profile:

```bash
caesar alias
```

Or specify the desired shell explicitly:

```bash
# Configure Bash (~/.bashrc)
caesar alias --setup bash

# Configure Zsh (~/.zshrc)
caesar alias --setup zsh

# Configure PowerShell ($PROFILE)
caesar alias --setup powershell
```

If you want to preview the script contents without writing them to a file:

```bash
caesar alias --dry-run
```

---

## 3. Manual Setup

If you prefer not to have the CLI modify your shell profile, copy the corresponding code blocks below into your configuration file:

### A. For Unix (Bash / Zsh)

Add this code block to the end of your `~/.bashrc` or `~/.zshrc` file:

```bash
# <<< CAESAR NATIVE-LIKE WRAPPER START >>>
claude() {
  if [ "$1" = "plugin" ] && [ "$2" = "marketplace" ] && [ "$3" = "add" ] && [ -n "$4" ]; then
    caesar add "$4" --tool claude
  elif [ "$1" = "plugin" ] && [ "$2" = "install" ] && [ -n "$3" ]; then
    caesar add "$3" --tool claude
  else
    command claude "$@"
  fi
}

opencode() {
  if [ "$1" = "subagent" ] && [ "$2" = "add" ] && [ -n "$3" ]; then
    caesar add "$3" --tool opencode
  elif [ "$1" = "subagent" ] && [ "$2" = "remove" ] && [ -n "$3" ]; then
    caesar remove "$3"
  else
    command opencode "$@"
  fi
}
# <<< CAESAR NATIVE-LIKE WRAPPER END >>>
```

### B. For Windows (PowerShell)

Add this code block to your PowerShell profile file (the path shown when running the `$PROFILE` command in PowerShell):

```powershell
# <<< CAESAR NATIVE-LIKE WRAPPER START >>>
function claude {
    if ($args[0] -eq "plugin" -and $args[1] -eq "marketplace" -and $args[2] -eq "add" -and $args[3]) {
        caesar add $args[3] --tool claude
    } elseif ($args[0] -eq "plugin" -and $args[1] -eq "install" -and $args[2]) {
        caesar add $args[2] --tool claude
    } else {
        $realBin = (Get-Command claude -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1).Path
        if (-not $realBin) {
            Write-Error "The underlying command 'claude' was not found in PATH."
            return
        }
        & $realBin @args
    }
}

function opencode {
    if ($args[0] -eq "subagent" -and $args[1] -eq "add" -and $args[2]) {
        caesar add $args[2] --tool opencode
    } elseif ($args[0] -eq "subagent" -and $args[1] -eq "remove" -and $args[2]) {
        caesar remove $args[2]
    } else {
        $realBin = (Get-Command opencode -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1).Path
        if (-not $realBin) {
            Write-Error "The underlying command 'opencode' was not found in PATH."
            return
        }
        & $realBin @args
    }
}
# <<< CAESAR NATIVE-LIKE WRAPPER END >>>
```
