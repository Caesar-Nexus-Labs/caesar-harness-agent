import * as fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectActiveTools } from './tool-detector.js';

vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs')>();
  return {
    ...original,
    existsSync: vi.fn(),
  };
});

describe('tool-detector', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects local workspace active tools', () => {
    const mockExists = vi.mocked(fs.existsSync);
    mockExists.mockImplementation((p) => {
      const pathStr = String(p).replace(/\\/g, '/');
      return pathStr.includes('/.claude') || pathStr.includes('/.opencode');
    });

    const active = detectActiveTools('/test/workspace');
    expect(active).toContain('claude');
    expect(active).toContain('opencode');
    expect(active).not.toContain('kiro');
  });

  it('detects fallback IDE configs as agents-md', () => {
    const mockExists = vi.mocked(fs.existsSync);
    mockExists.mockImplementation((p) => {
      const pathStr = String(p).replace(/\\/g, '/');
      return pathStr.includes('/.cursor');
    });

    const active = detectActiveTools('/test/workspace');
    expect(active).toContain('agents-md');
  });

  it('detects global tools from home configuration directories', () => {
    const mockExists = vi.mocked(fs.existsSync);
    mockExists.mockImplementation((p) => {
      const pathStr = String(p).replace(/\\/g, '/');
      // Mock global .claude folder existence in home dir
      return pathStr.endsWith('/.claude') || pathStr.endsWith('/.claude/agents');
    });

    const active = detectActiveTools('/test/workspace');
    expect(active).toContain('claude');
    expect(active).not.toContain('opencode');
  });

  it('returns an empty array if no tools are detected', () => {
    const mockExists = vi.mocked(fs.existsSync);
    mockExists.mockReturnValue(false);

    const active = detectActiveTools('/test/workspace');
    expect(active).toEqual([]);
  });
});
