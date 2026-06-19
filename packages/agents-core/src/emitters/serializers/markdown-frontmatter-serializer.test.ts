import { describe, expect, it } from 'vitest';
import { serializeMarkdownAgent } from './markdown-frontmatter-serializer.js';

describe('serializeMarkdownAgent', () => {
  it('normalizes CRLF and CR in the body to LF (cross-platform determinism)', () => {
    const crlfBody = '## Role & Expertise\r\nLine.\r\n\r\n## Boundaries\rEnd.';
    const out = serializeMarkdownAgent({ name: 'x' }, ['name'], crlfBody);
    expect(out).not.toContain('\r');
  });

  it('emits frontmatter keys in the given order', () => {
    const out = serializeMarkdownAgent({ b: '2', a: '1' }, ['a', 'b'], 'body');
    expect(out.indexOf('a:')).toBeLessThan(out.indexOf('b:'));
  });

  it('omits undefined frontmatter values', () => {
    const out = serializeMarkdownAgent({ name: 'x', color: undefined }, ['name', 'color'], 'body');
    expect(out).not.toContain('color');
  });
});
