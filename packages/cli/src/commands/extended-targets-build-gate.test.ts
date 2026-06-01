import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeTmpDir, realRepoRoot, removeDir } from '../test-support/tmp-agent-repo.js';
import { runBuild } from './build-command.js';

// F2 false-green guard: drive the REAL CLI build (runBuild) for the 3 extended targets over ALL
// authored agents, then assert real files on disk. If kilo were mis-routed to the per-agent path
// (no per-agent emitter → skipped, 0 files), existsSync('.kilocodemodes') would fail here — the
// gate catches the routing regression instead of silently passing.

describe('extended-target build gate (gemini, openhands, kilo) — real files on disk', () => {
  const root = realRepoRoot();
  let out: string;

  beforeEach(() => {
    out = makeTmpDir('caesar-cli-extgate-');
  });
  afterEach(() => {
    removeDir(out);
  });

  it('writes .gemini/agents, .agents/skills/{slug}/SKILL.md, and .kilocodemodes for all agents', () => {
    const result = runBuild({ tool: ['gemini', 'openhands', 'kilo'], out, root });

    expect(result.parseFailures).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.agentCount).toBeGreaterThanOrEqual(7);

    // Kilo aggregate → exactly one .kilocodemodes at the tool root.
    expect(existsSync(join(out, 'kilo', '.kilocodemodes'))).toBe(true);
    expect((result.writtenByTool.kilo ?? []).length).toBe(1);

    // Gemini → one flat file per agent.
    expect((result.writtenByTool.gemini ?? []).length).toBe(result.agentCount);

    // OpenHands → one nested {slug}/SKILL.md per agent; assert the folder shape on disk.
    const openhandsFiles = result.writtenByTool.openhands ?? [];
    expect(openhandsFiles.length).toBe(result.agentCount);
    expect(openhandsFiles.every((p) => p.endsWith('SKILL.md'))).toBe(true);
    const skillsDir = join(out, 'openhands', '.agents', 'skills');
    expect(existsSync(skillsDir)).toBe(true);
    // each entry under skills/ is a directory holding a SKILL.md
    for (const slugDir of readdirSync(skillsDir)) {
      expect(existsSync(join(skillsDir, slugDir, 'SKILL.md'))).toBe(true);
    }
  });
});
