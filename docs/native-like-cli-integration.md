# Native-Like CLI Commands & Shell Integration

Bản hướng dẫn này giải thích cách thiết lập các trình bao bọc (shell wrappers) giúp bạn sử dụng cú pháp cài đặt plugin nguyên bản của các công cụ đích (như `claude`, `opencode`) trực tiếp từ dòng lệnh.

## 1. Cơ chế hoạt động (How It Works)

Khi bạn gõ lệnh cài đặt plugin của bên thứ ba, trình bao bọc shell sẽ chặn lệnh và chuyển tiếp tương đương sang lệnh `caesar add`:

* `claude plugin marketplace add <src>` $\rightarrow$ `caesar add <src> --tool claude`
* `claude plugin install <src>` $\rightarrow$ `caesar add <src> --tool claude`
* `opencode subagent add <src>` $\rightarrow$ `caesar add <src> --tool opencode`
* `opencode subagent remove <name>` $\rightarrow$ `caesar remove <name>`
* `kiro agent install <src>` $\rightarrow$ `caesar add <src> --tool kiro`
* `copilot agent add <src>` $\rightarrow$ `caesar add <src> --tool copilot`
* `factory agent add <src>` $\rightarrow$ `caesar add <src> --tool factory`
* `openhands agent install <src>` $\rightarrow$ `caesar add <src> --tool openhands`

Các lệnh không liên quan đến cài đặt plugin (ví dụ: `claude dev`, `opencode start`) sẽ được chuyển tiếp trực tiếp sang công cụ gốc với hiệu năng không thay đổi (latency < 10ms) và không có nguy cơ lặp vô hạn (recursion).

---

## 2. Thiết lập tự động (Automatic Setup)

Để tự động phát hiện shell hiện tại và ghi cấu hình vào profile của bạn:

```bash
caesar alias
```

Hoặc chỉ định rõ shell mong muốn:

```bash
# Cấu hình Bash (~/.bashrc)
caesar alias --setup bash

# Cấu hình Zsh (~/.zshrc)
caesar alias --setup zsh

# Cấu hình PowerShell ($PROFILE)
caesar alias --setup powershell
```

Nếu bạn muốn xem trước nội dung script mà không ghi đè lên file:

```bash
caesar alias --dry-run
```

---

## 3. Cấu hình thủ công (Manual Setup)

Nếu bạn không muốn CLI chỉnh sửa profile của mình, hãy sao chép các khối mã tương ứng dưới đây vào file cấu hình của bạn:

### A. Đối với Unix (Bash / Zsh)

Thêm đoạn mã này vào cuối file `~/.bashrc` hoặc `~/.zshrc`:

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

### B. Đối với Windows (PowerShell)

Thêm đoạn mã này vào file profile PowerShell của bạn (đường dẫn hiển thị khi chạy lệnh `$PROFILE` trong PowerShell):

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
# <<< CAESAR NATIVE-LIKE WRAPPER END >>>
```
