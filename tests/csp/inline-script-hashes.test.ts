/**
 * CSP guard: ensures every executable `<script is:inline>` authored in an .astro
 * template has its SHA-256 digest pinned in astro.config.mjs (scriptDirective.hashes).
 *
 * WHY THIS EXISTS
 * Astro's security.csp (astro@6.x) does NOT auto-hash template-authored
 * `<script is:inline>` blocks — `is:inline` opts the script out of Astro's
 * processing, so Astro never sees its body to compute a hash. (Verified in
 * node_modules/astro: core/csp/common.js `trackScriptHashes` only hashes
 * internals.inlinedScripts + client directives + bundled chunks + settings.scripts;
 * core/fetch/fetch-state.js `extraScriptHashes` only hashes the route head scripts.
 * Template is:inline is in NEITHER.) With `script-src 'self' <hashes>` and no
 * 'unsafe-inline', the browser BLOCKS any inline script whose hash is missing —
 * a runtime-only failure the build/typecheck/test gates can't otherwise catch.
 *
 * We therefore pin those hashes by hand in astro.config.mjs. This test recomputes
 * each hash from the .astro source on every CI run and fails if a body changed
 * (even whitespace) without the pin being updated — killing the hand-pinning footgun.
 *
 * The digest format matches Astro exactly (core/encryption.js `generateCspDigest`):
 *   "sha256-" + base64( SHA-256( utf8(body) ) )
 * where `body` is the EXACT inner text between `<script ...>` and `</script>`
 * (verbatim whitespace) — is:inline emits the source body unchanged, verified
 * byte-for-byte against the compiled server output at authoring time.
 *
 * DISCOVERY: every `.astro` under src/ is scanned dynamically (not a hard-coded
 * list), so an is:inline script added in ANY template is caught — it must be
 * pinned or this test fails. Conversely, removing a script makes its pin "stale"
 * and the stale-pin check fails until the pin is removed.
 *
 * SCOPE: only executable inline scripts. `<script type="application/json">` data
 * islands are non-executable; CSP script-src does not govern them, so they are
 * intentionally excluded.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

// This file lives at tests/csp/, so go up two levels to reach the repo root.
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const srcDir = join(repoRoot, 'src');

/** sha256(base64) of the body, exactly as Astro's generateCspDigest produces it. */
function cspDigest(body: string): string {
  return 'sha256-' + createHash('sha256').update(body, 'utf8').digest('base64');
}

/** Every .astro file under src/, discovered recursively (repo-relative paths). */
function findAstroFiles(): string[] {
  return readdirSync(srcDir, { recursive: true })
    .map((entry) => String(entry))
    .filter((rel) => rel.endsWith('.astro'))
    .map((rel) => relative(repoRoot, join(srcDir, rel)))
    .sort();
}

/**
 * Extract the inner text of each executable `<script is:inline>` in a file.
 * Skips `type="application/json"` (data islands — not executable).
 */
function extractExecutableInlineScripts(repoRelPath: string): string[] {
  const src = readFileSync(join(repoRoot, repoRelPath), 'utf8');
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  const bodies: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const attrs = m[1];
    const body = m[2];
    if (!/\bis:inline\b/.test(attrs)) continue; // only is:inline
    if (/type\s*=\s*["']application\/json["']/.test(attrs)) continue; // skip data island
    bodies.push(body);
  }
  return bodies;
}

/** Pull the string entries of scriptDirective.hashes from astro.config.mjs. */
function readPinnedHashes(): string[] {
  const cfg = readFileSync(join(repoRoot, 'astro.config.mjs'), 'utf8');
  const block = cfg.match(/scriptDirective\s*:\s*\{[\s\S]*?hashes\s*:\s*\[([\s\S]*?)\]/);
  if (!block) return [];
  const hashes: string[] = [];
  const hashRe = /["'](sha(?:256|384|512)-[^"']+)["']/g;
  let h: RegExpExecArray | null;
  while ((h = hashRe.exec(block[1])) !== null) hashes.push(h[1]);
  return hashes;
}

describe('CSP inline-script hash pins', () => {
  const sources = findAstroFiles()
    .map((rel) => ({ rel, bodies: extractExecutableInlineScripts(rel) }))
    .filter((s) => s.bodies.length > 0);
  const pinned = readPinnedHashes();

  it('discovers at least one executable is:inline script under src/ (guards against a broken scan)', () => {
    // A vacuous pass (regex/glob silently finding nothing) would make every
    // per-script assertion below trivially true. This anchors the suite.
    const total = sources.reduce((n, s) => n + s.bodies.length, 0);
    expect(total).toBeGreaterThan(0);
  });

  for (const { rel, bodies } of sources) {
    bodies.forEach((body, i) => {
      const digest = cspDigest(body);
      it(`pins the hash for ${rel} inline script #${i + 1} (${digest.slice(0, 19)}…)`, () => {
        expect(pinned).toContain(digest);
      });
    });
  }

  it('has no stale pins (every pinned hash maps to a live inline script)', () => {
    // Astro merges these pins with the hashes it auto-computes for processed scripts,
    // so the pin list should ONLY contain our is:inline hashes. A pin that matches no
    // current inline body is dead config — flag it so it gets cleaned up.
    const liveDigests = new Set(sources.flatMap((s) => s.bodies.map(cspDigest)));
    const stale = pinned.filter((p) => !liveDigests.has(p));
    expect(stale).toEqual([]);
  });
});
