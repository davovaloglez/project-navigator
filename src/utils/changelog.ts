export interface ChangelogSection {
  name: string;
  items: string[];
}

export interface ChangelogRelease {
  version: string;
  date: string;
  sections: ChangelogSection[];
}

const RELEASE_HEADER = /^##\s*\[([\d.]+)\]\s*-\s*(\d{4}-\d{2}-\d{2})\s*$/;
const SECTION_HEADER = /^###\s+(.+?)\s*$/;
const BULLET = /^-\s+(.*)$/;

/**
 * Parses a CHANGELOG.md following the Keep-a-Changelog style used by this project:
 *   ## [x.y.z] - YYYY-MM-DD
 *   ### Added | ### Changed | ### Fixed | ...
 *   - bullet
 *     continuation line (indented)
 */
export function parseChangelog(raw: string): ChangelogRelease[] {
  const lines = raw.split(/\r?\n/);
  const releases: ChangelogRelease[] = [];
  let currentRelease: ChangelogRelease | null = null;
  let currentSection: ChangelogSection | null = null;
  let currentItem: string[] | null = null;

  const flushItem = () => {
    if (currentItem && currentSection) {
      currentSection.items.push(currentItem.join(' ').trim());
    }
    currentItem = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim()) {
      flushItem();
      continue;
    }

    const releaseMatch = line.match(RELEASE_HEADER);
    if (releaseMatch) {
      flushItem();
      currentSection = null;
      currentRelease = { version: releaseMatch[1], date: releaseMatch[2], sections: [] };
      releases.push(currentRelease);
      continue;
    }

    if (!currentRelease) continue;

    const sectionMatch = line.match(SECTION_HEADER);
    if (sectionMatch) {
      flushItem();
      currentSection = { name: sectionMatch[1], items: [] };
      currentRelease.sections.push(currentSection);
      continue;
    }

    if (!currentSection) continue;

    const bulletMatch = line.match(BULLET);
    if (bulletMatch) {
      flushItem();
      currentItem = [bulletMatch[1]];
      continue;
    }

    // Continuation line: indented text that belongs to the current bullet
    if (/^\s+\S/.test(rawLine) && currentItem) {
      currentItem.push(line.trim());
      continue;
    }

    // Non-bullet, non-section line inside a section (e.g., "**Core**" subheader in v1.0.0).
    // Treat as its own item to preserve visibility.
    if (currentItem) flushItem();
    currentSection.items.push(line.trim());
  }

  flushItem();
  return releases;
}

/**
 * Minimal inline markdown renderer: supports **bold** and `code` only.
 * Input is from our own versioned CHANGELOG file, not user input — no XSS vector.
 */
export function renderMarkdownInline(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-700/60 text-cyan-300 rounded text-[0.85em] font-mono">$1</code>');
}

/** Format "2026-04-17" → "17 Abr 2026" in Spanish. */
export function formatReleaseDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
