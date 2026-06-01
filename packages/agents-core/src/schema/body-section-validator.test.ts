import { describe, expect, it } from 'vitest';
import { REQUIRED_SECTIONS, validateBody } from './body-section-validator.js';

const fullBody = REQUIRED_SECTIONS.map((s) => `## ${s}\n\ncontent\n`).join('\n');

describe('validateBody', () => {
  it('accepts a body with all 6 sections in order', () => {
    const r = validateBody(fullBody);
    expect(r.ok).toBe(true);
    expect(r.missingSections).toEqual([]);
    expect(r.outOfOrder).toBe(false);
  });

  it('flags missing sections', () => {
    const partial = '## Role & Expertise\n\ncontent\n';
    const r = validateBody(partial);
    expect(r.ok).toBe(false);
    expect(r.missingSections).toContain('Boundaries');
    expect(r.missingSections.length).toBe(5);
  });

  it('detects out-of-order sections', () => {
    const reordered = [
      'Boundaries',
      'Role & Expertise',
      'When to Use',
      'Workflow',
      'Checklist & Heuristics',
      'Output Contract',
    ]
      .map((s) => `## ${s}\n\ncontent\n`)
      .join('\n');
    const r = validateBody(reordered);
    expect(r.ok).toBe(false);
    expect(r.outOfOrder).toBe(true);
  });

  it('matches ### headings too', () => {
    const body = REQUIRED_SECTIONS.map((s) => `### ${s}\n\ncontent\n`).join('\n');
    expect(validateBody(body).ok).toBe(true);
  });

  it('reports lineCount and emits no warning at or below the 300-line soft cap', () => {
    const r = validateBody(fullBody);
    expect(r.lineCount).toBe(fullBody.split('\n').length);
    expect(r.warnings).toEqual([]);
  });

  it('soft-warns above 300 lines but stays ok when sections are valid', () => {
    // Pad the valid body past the 300-line soft cap with blank lines.
    const padded = `${fullBody}\n${'\n'.repeat(320)}`;
    const r = validateBody(padded);
    expect(r.lineCount).toBeGreaterThan(300);
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toMatch(/300/);
    // Soft cap is advisory: line count NEVER fails validation.
    expect(r.ok).toBe(true);
  });

  it('does not let the soft-warn rescue a structurally invalid body', () => {
    const padded = `## Role & Expertise\n\ncontent\n${'\n'.repeat(320)}`;
    const r = validateBody(padded);
    expect(r.lineCount).toBeGreaterThan(300);
    expect(r.warnings.length).toBe(1);
    expect(r.ok).toBe(false); // missing sections still fail
  });
});
