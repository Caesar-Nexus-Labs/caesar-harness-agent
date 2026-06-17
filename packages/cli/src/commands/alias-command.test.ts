import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ANCHOR_END, ANCHOR_START } from '../templates/wrapper-templates.js';
import { runAlias } from './alias-command.js';

describe('runAlias command handler', () => {
  const mockHome = join(tmpdir(), `caesar-alias-test-${Date.now()}`);
  let originalEnvHome: string | undefined;

  beforeEach(() => {
    originalEnvHome = process.env.HOME;
    process.env.HOME = mockHome;
    // For Windows OS user profile override:
    // We override process.env.USERPROFILE just in case os.homedir uses it
    process.env.USERPROFILE = mockHome;
  });

  afterEach(() => {
    process.env.HOME = originalEnvHome;
    try {
      rmSync(mockHome, { recursive: true, force: true });
    } catch {}
  });

  it('should run dry-run without modifying files', () => {
    const res = runAlias({ setup: 'bash', dryRun: true });
    expect(res.dryRun).toBe(true);
    expect(res.updated).toBe(false);
    expect(res.content).toContain(ANCHOR_START);
    expect(existsSync(res.profilePath)).toBe(false);
  });

  it('should write file on setup and handle idempotency', () => {
    const res = runAlias({ setup: 'bash', dryRun: false });
    expect(res.updated).toBe(true);
    expect(existsSync(res.profilePath)).toBe(true);

    const firstWrite = readFileSync(res.profilePath, 'utf8');
    expect(firstWrite).toContain(ANCHOR_START);

    // Running again should be idempotent (no update)
    const res2 = runAlias({ setup: 'bash', dryRun: false });
    expect(res2.updated).toBe(false);

    const secondWrite = readFileSync(res.profilePath, 'utf8');
    expect(secondWrite).toBe(firstWrite);
  });

  it('should support updating pre-existing wrapper block', () => {
    const profilePath = join(mockHome, '.zshrc');
    const initialContent = `
# Pre-existing zsh content
${ANCHOR_START}
old stuff
${ANCHOR_END}
# Trailing content
`;
    // Ensure dir exists
    const fs = require('node:fs');
    fs.mkdirSync(mockHome, { recursive: true });
    writeFileSync(profilePath, initialContent, 'utf8');

    const res = runAlias({ setup: 'zsh', dryRun: false });
    expect(res.updated).toBe(true);

    const afterUpdate = readFileSync(profilePath, 'utf8');
    expect(afterUpdate).toContain('# Pre-existing zsh content');
    expect(afterUpdate).toContain('# Trailing content');
    expect(afterUpdate).not.toContain('old stuff');
    expect(afterUpdate).toContain('claude()');
  });

  it('should resolve correct PowerShell profile path depending on platform and shell Core', () => {
    // Keep a backup of platform descriptor
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

    try {
      // Mock platform to non-windows (linux)
      Object.defineProperty(process, 'platform', { value: 'linux' });
      const resLinux = runAlias({ setup: 'powershell', dryRun: true });
      expect(resLinux.profilePath.replace(/\\/g, '/')).toContain(
        '.config/powershell/Microsoft.PowerShell_profile.ps1',
      );

      // Mock platform to windows
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const resWin = runAlias({ setup: 'powershell', dryRun: true });
      expect(resWin.profilePath.replace(/\\/g, '/')).toContain(
        'PowerShell/Microsoft.PowerShell_profile.ps1',
      );
    } finally {
      if (originalPlatform) {
        Object.defineProperty(process, 'platform', originalPlatform);
      }
    }
  });

  it('should resolve correct PowerShell profile path with OneDrive redirection on Windows', () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    const originalOneDrive = process.env.ONEDRIVE;
    const fs = require('node:fs');

    try {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      // 1. Create a OneDrive Documents folder in mockHome
      const oneDriveDocs = join(mockHome, 'OneDrive', 'Documents');
      fs.mkdirSync(join(oneDriveDocs, 'PowerShell'), { recursive: true });

      const resWinOneDrive = runAlias({ setup: 'pwsh', dryRun: true });
      expect(resWinOneDrive.profilePath.replace(/\\/g, '/')).toContain(
        'OneDrive/Documents/PowerShell/Microsoft.PowerShell_profile.ps1',
      );

      // 2. Test environment variable ONEDRIVE redirection
      const customOneDriveDocs = join(mockHome, 'CustomOneDrive', 'Documents');
      fs.mkdirSync(join(customOneDriveDocs, 'PowerShell'), { recursive: true });
      process.env.ONEDRIVE = join(mockHome, 'CustomOneDrive');

      const resWinEnvOneDrive = runAlias({ setup: 'pwsh', dryRun: true });
      expect(resWinEnvOneDrive.profilePath.replace(/\\/g, '/')).toContain(
        'CustomOneDrive/Documents/PowerShell/Microsoft.PowerShell_profile.ps1',
      );
    } finally {
      process.env.ONEDRIVE = originalOneDrive;
      if (originalPlatform) {
        Object.defineProperty(process, 'platform', originalPlatform);
      }
    }
  });
});
