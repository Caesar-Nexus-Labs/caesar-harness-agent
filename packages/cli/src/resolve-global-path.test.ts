import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveGlobalCaesarDir, resolveGlobalToolDir } from './resolve-global-path.js';

describe('resolve-global-path', () => {
  const originalEnv = process.env;
  const originalPlatform = process.platform;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  describe('resolveGlobalCaesarDir', () => {
    it('resolves on win32', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';
      const dir = resolveGlobalCaesarDir();
      expect(dir.replace(/\\/g, '/')).toBe('C:/Users/test/AppData/Roaming/Caesar');
    });

    it('resolves on darwin', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      const dir = resolveGlobalCaesarDir();
      // homedir uses current OS but we check the suffix
      expect(dir.replace(/\\/g, '/')).toMatch(/\/Library\/Application Support\/Caesar$/);
    });

    it('resolves on linux (XDG_DATA_HOME set)', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      process.env.XDG_DATA_HOME = '/home/test/.local/custom';
      const dir = resolveGlobalCaesarDir();
      expect(dir.replace(/\\/g, '/')).toBe('/home/test/.local/custom/caesar');
    });

    it('resolves on linux (fallback)', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      delete process.env.XDG_DATA_HOME;
      const dir = resolveGlobalCaesarDir();
      expect(dir.replace(/\\/g, '/')).toMatch(/\/\.local\/share\/caesar$/);
    });
  });

  describe('resolveGlobalToolDir', () => {
    it('returns path for claude', () => {
      const dir = resolveGlobalToolDir('claude');
      expect(dir).toBeDefined();
      expect(dir?.replace(/\\/g, '/')).toMatch(/\/\.claude\/agents$/);
    });

    it('returns undefined for copilot', () => {
      expect(resolveGlobalToolDir('copilot')).toBeUndefined();
    });

    it('returns undefined for agents-md', () => {
      expect(resolveGlobalToolDir('agents-md')).toBeUndefined();
    });

    it('returns path for opencode on win32', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';
      const dir = resolveGlobalToolDir('opencode');
      expect(dir?.replace(/\\/g, '/')).toBe('C:/Users/test/AppData/Roaming/opencode/agents');
    });

    it('returns path for opencode on linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      process.env.XDG_CONFIG_HOME = '/home/test/.config';
      const dir = resolveGlobalToolDir('opencode');
      expect(dir?.replace(/\\/g, '/')).toBe('/home/test/.config/opencode/agents');
    });
  });
});
