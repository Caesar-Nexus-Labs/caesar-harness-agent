import { afterEach, describe, expect, it } from 'vitest';
import { makeTmpRepoWithCat01, removeDir, writeBadAgent } from '../test-support/tmp-agent-repo.js';
import { runValidate } from './validate-command.js';

// validate integration: a clean cat-01 repo passes; injecting a broken agent fails. Uses an
// isolated tmp repo (copy of real cat-01) so the bad fixture never pollutes the source tree.

describe('runValidate', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) removeDir(d);
  });

  function tmpRepo(): string {
    const root = makeTmpRepoWithCat01();
    dirs.push(root);
    return root;
  }

  it('returns ok with zero failures on a clean agent set', () => {
    const result = runValidate({ root: tmpRepo() });
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.checked).toBeGreaterThanOrEqual(7);
  });

  it('reports a failure when a deliberately-invalid agent is present', () => {
    const root = tmpRepo();
    writeBadAgent(root);
    const result = runValidate({ root });
    expect(result.ok).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    // fast-glob normalizes to forward slashes; match on the filename to stay separator-agnostic.
    const bad = result.failures.find((f) => f.path.endsWith('broken-agent.md'));
    expect(bad).toBeDefined();
    expect(bad?.issues.length).toBeGreaterThan(0);
  });

  it('passes --strict (output validators) over a clean set', () => {
    const result = runValidate({ root: tmpRepo(), strict: true });
    expect(result.ok).toBe(true);
    expect(result.strict).toBe(true);
    expect(result.outputFailures).toEqual([]);
  });

  it('still fails parse before reaching output validation under --strict', () => {
    const root = tmpRepo();
    writeBadAgent(root);
    const result = runValidate({ root, strict: true });
    expect(result.ok).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
  });
});
