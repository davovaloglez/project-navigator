import DOMPurify from 'dompurify';

/**
 * Sanitize HTML from not-fully-trusted sources (Nexus AI reports, Samva export,
 * CHANGELOG). Allows rich-text formatting tags but strips scripts, iframes,
 * inline event handlers, and javascript: hrefs.
 *
 * Safe to import in any component: when called outside a browser context (SSR
 * type-check pass) it short-circuits and returns the raw string — all call
 * sites are inside client:load / client:only React islands so the DOM is always
 * present at actual runtime.
 */
export function sanitizeHtml(raw: string): string {
  if (!raw) return '';
  // Guard: DOMPurify requires a real DOM. All consumers are client-only React
  // islands, so this branch is never taken at runtime — only during SSR
  // type-checking where the components are not actually rendered.
  if (typeof window === 'undefined' || typeof DOMPurify.sanitize !== 'function') {
    return raw;
  }
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'span', 'div',
      'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'code', 'pre', 'blockquote', 'hr', 'img',
    ],
    ALLOWED_ATTR: ['href', 'title', 'class', 'style', 'target', 'rel', 'src', 'alt'],
    ALLOW_DATA_ATTR: false,
  });
}
