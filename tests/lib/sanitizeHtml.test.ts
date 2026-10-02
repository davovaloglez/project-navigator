// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '@lib/sanitizeHtml';

describe('sanitizeHtml', () => {
  it('returns empty string for empty/falsy input', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null as unknown as string)).toBe('');
  });

  it('strips <script> tags and content', () => {
    const out = sanitizeHtml('<p>Hello</p><script>alert(1)</script>');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('<p>Hello</p>');
  });

  it('strips onerror and other inline event handlers from img', () => {
    const out = sanitizeHtml('<img src="x" onerror="alert(1)" alt="test">');
    expect(out).not.toContain('onerror');
    // img tag itself is allowed (src and alt survive)
    expect(out).toContain('<img');
    expect(out).toContain('alt="test"');
  });

  it('strips javascript: hrefs', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript:');
  });

  it('preserves allowed formatting tags', () => {
    const html = '<b>bold</b> <i>italic</i> <strong>strong</strong>';
    const out = sanitizeHtml(html);
    expect(out).toContain('<b>bold</b>');
    expect(out).toContain('<i>italic</i>');
    expect(out).toContain('<strong>strong</strong>');
  });

  it('preserves allowed anchor tags with safe href', () => {
    const html = '<a href="https://example.com" target="_blank" rel="noopener">Link</a>';
    const out = sanitizeHtml(html);
    expect(out).toContain('<a');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('Link</a>');
  });

  it('preserves table structure', () => {
    const html = '<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>D</td></tr></tbody></table>';
    const out = sanitizeHtml(html);
    expect(out).toContain('<table>');
    expect(out).toContain('<th>H</th>');
    expect(out).toContain('<td>D</td>');
  });

  it('strips iframe tags', () => {
    const out = sanitizeHtml('<iframe src="https://evil.com"></iframe><p>safe</p>');
    expect(out).not.toContain('<iframe');
    expect(out).toContain('<p>safe</p>');
  });

  it('strips on* attributes from allowed tags', () => {
    const out = sanitizeHtml('<div onclick="alert(1)">hello</div>');
    expect(out).not.toContain('onclick');
    expect(out).toContain('hello');
  });

  it('passes through plain text unchanged', () => {
    const text = 'Hello, world! No HTML here.';
    expect(sanitizeHtml(text)).toBe(text);
  });
});
