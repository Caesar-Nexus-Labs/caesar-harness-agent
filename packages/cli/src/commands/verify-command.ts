import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readLock } from '../caesar-lock.js';

export interface VerifyFinding {
  path: string;
  severity: 'error' | 'warning';
  rule: string;
  message: string;
}

export interface VerifyResult {
  checkedFiles: number;
  findings: VerifyFinding[];
  ok: boolean;
}

const SECURITY_PATTERNS: ReadonlyArray<{
  rule: string;
  severity: 'error' | 'warning';
  pattern: RegExp;
  message: string;
}> = [
  {
    rule: 'dangerous-shell-rm',
    severity: 'error',
    pattern: /\brm\s+-rf\s+\/(?:\s|$)/,
    message: 'Detected destructive root deletion command (rm -rf /).',
  },
  {
    rule: 'remote-pipe-exec',
    severity: 'error',
    pattern: /\b(curl|wget)\b[^\n|]*\|\s*(ba)?sh\b/,
    message: 'Detected remote script pipe-to-shell execution.',
  },
  {
    rule: 'prompt-injection-override',
    severity: 'error',
    pattern: /ignore\s+(all\s+)?previous\s+instructions/i,
    message: 'Detected prompt-injection override pattern.',
  },
  {
    rule: 'env-exfiltration',
    severity: 'warning',
    pattern: /\b(cat|printenv|env)\b[^\n]*\.env\b[^\n]*\|\s*(curl|nc|wget)\b/,
    message: 'Detected potential .env credential exfiltration pipeline.',
  },
];

export function scanAgentContent(filePath: string, content: string): VerifyFinding[] {
  const findings: VerifyFinding[] = [];
  for (const check of SECURITY_PATTERNS) {
    if (check.pattern.test(content)) {
      findings.push({
        path: filePath,
        severity: check.severity,
        rule: check.rule,
        message: check.message,
      });
    }
  }
  return findings;
}

export function runVerify(options: { cwd?: string } = {}): VerifyResult {
  const cwd = options.cwd ?? process.cwd();
  const lock = readLock(cwd);
  const findings: VerifyFinding[] = [];
  let checkedFiles = 0;

  for (const entry of Object.values(lock.plugins)) {
    for (const relPath of entry.installedPaths) {
      const absPath = resolve(cwd, relPath);
      if (!existsSync(absPath)) {
        findings.push({
          path: relPath,
          severity: 'error',
          rule: 'missing-locked-file',
          message: `Locked file missing on disk (plugin ${entry.name}@${entry.version}).`,
        });
        continue;
      }
      checkedFiles += 1;
      const content = readFileSync(absPath, 'utf8');
      findings.push(...scanAgentContent(relPath, content));
    }
  }

  const hasErrors = findings.some((f) => f.severity === 'error');
  return { checkedFiles, findings, ok: !hasErrors };
}
