import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  ANCHOR_END,
  ANCHOR_START,
  generateFullScript,
  type Shell,
} from '../templates/wrapper-templates.js';

export interface AliasOptions {
  setup?: string;
  dryRun?: boolean;
}

export interface AliasResult {
  shell: string;
  profilePath: string;
  updated: boolean;
  dryRun: boolean;
  content: string;
  message: string;
}

function getProfilePath(shell: string, isPowerShellCore: boolean): string {
  const home = homedir();
  if (shell === 'bash') {
    return join(home, '.bashrc');
  }
  if (shell === 'zsh') {
    return join(home, '.zshrc');
  }
  if (shell === 'powershell') {
    if (process.platform !== 'win32') {
      return join(home, '.config', 'powershell', 'Microsoft.PowerShell_profile.ps1');
    }
    const folder = isPowerShellCore ? 'PowerShell' : 'WindowsPowerShell';

    // Check common OneDrive locations and registry-aligned folders on Windows
    const candidates: string[] = [];
    if (process.env.ONEDRIVE) {
      candidates.push(join(process.env.ONEDRIVE, 'Documents'));
    }
    candidates.push(join(home, 'OneDrive', 'Documents'));
    candidates.push(join(home, 'Documents'));

    for (const docDir of candidates) {
      const profilePath = join(docDir, folder, 'Microsoft.PowerShell_profile.ps1');
      if (existsSync(profilePath)) {
        return profilePath;
      }
    }

    for (const docDir of candidates) {
      if (existsSync(docDir)) {
        return join(docDir, folder, 'Microsoft.PowerShell_profile.ps1');
      }
    }

    return join(home, 'Documents', folder, 'Microsoft.PowerShell_profile.ps1');
  }
  throw new Error(`Unsupported shell: ${shell}`);
}

export function runAlias(options: AliasOptions): AliasResult {
  const shellInput = (options.setup || '').toLowerCase();
  const isPowerShellCore = shellInput === 'pwsh';

  let shell: Shell = 'bash';
  if (shellInput === 'zsh') {
    shell = 'zsh';
  } else if (shellInput === 'powershell' || shellInput === 'pwsh') {
    shell = 'powershell';
  } else if (shellInput && shellInput !== 'bash') {
    throw new Error(`Unsupported shell: ${options.setup}. Choose 'bash', 'zsh', or 'powershell'.`);
  } else if (!shellInput) {
    // Detect shell from env
    const envShell = process.env.SHELL || '';
    if (envShell.includes('zsh')) {
      shell = 'zsh';
    } else if (process.platform === 'win32') {
      shell = 'powershell';
    } else {
      shell = 'bash';
    }
  }

  const profilePath = getProfilePath(shell, isPowerShellCore);
  const wrapperContent = generateFullScript(shell);
  const dryRun = options.dryRun === true;

  if (dryRun) {
    return {
      shell,
      profilePath,
      updated: false,
      dryRun: true,
      content: wrapperContent,
      message: `[DRY RUN] Generated wrappers for ${shell}. Ready to write to ${profilePath}`,
    };
  }

  let profileContent = '';
  if (existsSync(profilePath)) {
    profileContent = readFileSync(profilePath, 'utf8');
  }

  let updatedContent = '';
  const startIndex = profileContent.indexOf(ANCHOR_START);
  const endIndex = profileContent.indexOf(ANCHOR_END);

  if (startIndex !== -1 && endIndex !== -1) {
    // Replace existing block
    updatedContent =
      profileContent.slice(0, startIndex) +
      wrapperContent +
      profileContent.slice(endIndex + ANCHOR_END.length);
  } else {
    // Append to end of file
    const trailingNewline = profileContent.endsWith('\n') ? '' : '\n';
    updatedContent = `${profileContent + trailingNewline + wrapperContent}\n`;
  }

  // Idempotency check: only write if changed
  const updated = updatedContent !== profileContent;
  if (updated) {
    try {
      mkdirSync(dirname(profilePath), { recursive: true });
      writeFileSync(profilePath, updatedContent, 'utf8');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to write to profile ${profilePath}: ${msg}. Please setup manually using the wrapper contents.`,
      );
    }
  }

  return {
    shell,
    profilePath,
    updated,
    dryRun: false,
    content: wrapperContent,
    message: updated
      ? `Successfully updated ${shell} profile at ${profilePath}`
      : `${shell} profile at ${profilePath} is already up to date`,
  };
}
