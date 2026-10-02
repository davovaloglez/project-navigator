# Plan 014: Enforce the Content-Security-Policy (drop `script-src 'unsafe-inline'`)

> **Executor instructions**: Follow step by step. Run every verification command before moving on. On
> any "STOP condition", stop and report. When done, update `plans/README.md`.
> This is the deferred second half of plan 007 (007 shipped the DOMPurify sanitization; CSP enforcement
> was explicitly deferred because it needs a nonce/hash strategy for the inline scripts).
>
> **Drift check (run first)**:
> `git diff --stat 0b9c306..HEAD -- src/middleware.ts src/layouts/Layout.astro src/pages/cs360.astro astro.config.mjs`
> Re-read the inline `<script>` sites and the `SECURITY_HEADERS` block before editing — the line
> numbers below were captured at develop `d2ded8a`.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED-HIGH (a wrong CSP silently breaks hydration / theme / charts in production only)
- **Depends on**: 007 (done — sanitization already shipped)
- **Category**: security
- **Planned at**: develop `d2ded8a`, 2026-06-23

## Why this matters

The app's CSP today is **Report-Only** with `script-src 'self' 'unsafe-inline'` (`src/middleware.ts:173`).
Report-Only logs violations but **blocks nothing** — it is not a mitigation. Combined with the CS360
stored-XSS surface (admin renders AI + customer HTML; sanitized in 007 but defense-in-depth matters),
an enforced CSP that disallows inline script is the control that actually stops an injected
`<script>` from executing. Moving from Report-Only to **enforced**, and removing `'unsafe-inline'` from
`script-src`, is the high-value win. `style-src 'unsafe-inline'` stays (see Scope).

## Current state (verified at develop `d2ded8a`)

**The hand-rolled CSP** lives in middleware, applied to every response:

`src/middleware.ts:166-182`
```ts
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), ...',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy-Report-Only':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://accounts.google.com; form-action 'self' https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests",
};
function withSecurityHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(key)) response.headers.set(key, value);
  }
  return response;
}
```

**The inline scripts that force `'unsafe-inline'` today** (these are the whole problem):

1. `src/layouts/Layout.astro:41-49` — **static** pre-paint theme/sidebar script (constant content):
   ```astro
   <script is:inline>
     (function() {
       var theme = localStorage.getItem('project-navigator-theme') || 'dark';
       document.documentElement.className = theme;
       if (localStorage.getItem('pn-sidebar-collapsed') === '1') {
         document.documentElement.classList.add('sidebar-collapsed');
       }
     })();
   </script>
   ```
2. `src/layouts/Layout.astro:50` — **DYNAMIC** permissions injection (content varies per user/request):
   ```astro
   <script is:inline set:html={`window.__PN_PERMS__=${permsJson};`} />
   ```
   `permsJson` is built per request from `getEffectivePermissions` (`Layout.astro:20-26`). **This is the
   hard case**: a build-time hash can't cover content that changes per request.
3. `src/pages/cs360.astro:22-30` — **static** pre-paint theme script (cs360 has its own `<html>`, does
   NOT use `Layout.astro`).
4. **Astro island hydration** — `client:load`/`client:only` islands (Sidebar, every Section) emit
   framework bootstrap inline scripts at render time. These are NOT in our source; the framework owns
   them. This is the reason a naive hand-rolled nonce is insufficient (you can't put `nonce=` on scripts
   you don't author) and why Astro's own CSP support is the recommended path.
5. **Inline styles** — React inline `style={...}` attributes (Recharts especially) and Tailwind v4
   produce inline styles. CSP nonces/hashes do **not** apply to style *attributes*, only `<style>`
   elements. So `style-src 'unsafe-inline'` cannot be removed without breaking the UI. Out of scope.

## Commands you will need

| Purpose   | Command            | Expected |
|-----------|--------------------|----------|
| Install   | `npm install`      | exit 0   |
| Typecheck | `npx astro check`  | exit 0   |
| Tests     | `npm test`         | all pass |
| Build     | `npm run build`    | exit 0   |
| Preview   | `npm run preview`  | serves the prod build (test CSP here, NOT dev) |

> **Critical**: CSP bugs frequently appear only in the **production build** (hydration scripts differ
> from dev). You MUST verify with `npm run build && npm run preview`, not just `npm run dev`.

## Recommended approach: Astro's built-in CSP (hashes) + eliminate the one dynamic inline script

Astro 6 ships first-class CSP support that computes **content hashes for every inline `<script>` and
`<style>` it renders — including framework hydration scripts and your `is:inline` blocks — at build
time**, and emits the policy itself. This solves cases 1, 3, 4 automatically. Read the current docs
first (the API surface has moved across Astro minors): use the `astro-docs` MCP
(`mcp__astro-docs__search_astro_docs` → query "Content Security Policy") or
https://docs.astro.build/en/reference/experimental-flags/csp/ . Confirm whether it is still under
`experimental.csp` or promoted to stable in the installed version (`astro@^6.2`), and confirm the exact
config shape before writing it.

The **only** blocker Astro's hashing can't solve by itself is case 2 (the dynamic per-request perms
script) — its content changes per request, so it has no stable build-time hash. **Fix it by removing
executable dynamic inline script entirely**, using a non-executable JSON data island:

- Emit perms as data, which CSP `script-src` does NOT govern (a `<script type="application/json">` is
  inert — the browser never executes it):
  ```astro
  <script type="application/json" id="pn-perms" set:html={permsJson}></script>
  ```
- Add a **static** (therefore hashable) reader that runs and parses it:
  ```astro
  <script is:inline>
    window.__PN_PERMS__ = JSON.parse(document.getElementById('pn-perms').textContent || '{}');
  </script>
  ```
- Update the consumer (`src/hooks/usePermissions.ts` → `readInlinePermissions()`, and anything reading
  `window.__PN_PERMS__`) only if timing changes. The reader runs synchronously in `<head>` before
  islands hydrate, same as today, so `window.__PN_PERMS__` is still set early — but VERIFY (grep for
  `__PN_PERMS__` and read each site). Keep the existing XSS-escaping of `permsJson`
  (`Layout.astro:23-26`); it's still correct for the data island.

This makes **all** remaining inline scripts static → fully hashable by Astro → `script-src` can drop
`'unsafe-inline'`.

### Reconciling the two CSP sources (important)

Astro's CSP injects a `<meta http-equiv="content-security-policy">` into each HTML page. The middleware
also sets a CSP **header** on every response. If both define `script-src`, the browser enforces **both
independently** (a resource must satisfy each) — easy to get a silent double-block. Decide and document
one ownership split:

- **Astro owns the CSP for HTML pages** (it has the hashes). Remove `script-src`/`style-src` (and the
  rest of the page-oriented directives) from the middleware's policy for HTML responses.
- **Middleware keeps a CSP for non-HTML responses** (`/api/*` JSON, redirects) — these never run inline
  script, so a strict `default-src 'none'` / `frame-ancestors 'none'` baseline is fine and cheap
  defense-in-depth. Or simply keep the other security headers (X-Frame-Options, HSTS, etc.) and let
  Astro's CSP be the only CSP. Either is acceptable; pick the simpler one that passes verification.

Whichever you choose, there must be **exactly one** authoritative `script-src` reaching the browser for
an HTML page. Verify with DevTools → Network → the document response headers AND the `<meta>` tag.

### Fallback approach (if Astro CSP is unavailable/unsuitable in the installed version)

If, after reading the docs, Astro's CSP can't be used (e.g. it doesn't cover the amplify adapter's
output, or the flag was removed), STOP and report before hand-rolling nonces — a hand-rolled nonce
cannot tag the framework's hydration scripts and will break hydration in production. Do not guess.

## Scope

**In scope**:
- `astro.config.mjs` — enable Astro CSP with the directives mirroring the current policy minus
  `script-src 'unsafe-inline'`.
- `src/layouts/Layout.astro` — convert the dynamic perms inline script (case 2) to a JSON data island
  + static reader. Leave the static theme/sidebar script as-is (Astro will hash it).
- `src/middleware.ts` — reconcile/trim the hand-rolled CSP per the ownership split above; flip from
  Report-Only to **enforced** for whatever CSP the middleware still emits.
- `src/pages/cs360.astro` — verify its inline script is covered (it should be hashed by Astro too);
  no change expected beyond confirming.
- Any `window.__PN_PERMS__` reader whose timing must be confirmed.

**Out of scope** (do NOT touch):
- `style-src 'unsafe-inline'` — **keep it**. React/Recharts/Tailwind emit inline style attributes that
  cannot be hashed. Removing it breaks the UI. This is an accepted residual; document it.
- The DOMPurify sanitization from 007 (already shipped — don't re-touch the sinks).
- Adding a CSP violation **reporting endpoint** (`report-uri`/`report-to`) — nice-to-have, separate
  follow-up. Don't build it here.
- `connect-src` allowances for the Nexus AI host (`ai.bit.lat`) — the browser doesn't call Nexus
  directly (it goes through `/api/cs360/analyze`, same-origin). Don't add it unless a violation proves
  otherwise.

## Git workflow

- Branch: `advisor/014-enforce-csp` cut from `origin/develop` (NOT master).
  `git checkout -b advisor/014-enforce-csp origin/develop`
- Commit 1: `refactor(csp): move dynamic perms to a JSON data island (hashable inline scripts)`
- Commit 2 (separate, independently revertible): `security(csp): enforce policy, drop script-src 'unsafe-inline'`
- Open a PR against **develop** when done (the maintainer reviews/merges).

## Steps

### Step 1: Read the docs, confirm the Astro CSP API for `astro@^6.2`

Use the `astro-docs` MCP or the URL above. Write down the exact config key and shape. Confirm it works
with `output: 'server'` + the `astro-aws-amplify` adapter. **STOP and report if it doesn't.**

### Step 2: Convert the dynamic perms script to a data island

Edit `Layout.astro:50` as described (data island + static reader). Grep every `__PN_PERMS__` reader
(`grep -rn "__PN_PERMS__" src/`) and confirm each still works against the new timing. Keep the escape.

**Verify**: `npx astro check` → 0. `npm run build && npm run preview`, open `/`, in DevTools console
run `window.__PN_PERMS__` → returns the perms object (not undefined). Sidebar still filters by perms.

### Step 3: Enable Astro CSP and reconcile the middleware

Enable Astro CSP in `astro.config.mjs` with directives = current policy minus `script-src 'unsafe-inline'`
(keep `style-src 'unsafe-inline'`). Apply the ownership split: remove the now-duplicated page directives
from the middleware CSP and flip whatever remains from `-Report-Only` to enforced.

**Verify**: `npm run build` → 0. Inspect `dist`/build output to confirm hashes are injected into the
page `<meta>`/headers.

### Step 4: Full production click-through with the console open (the real gate)

`npm run preview`. With DevTools **console + network** open, click through EVERY surface and watch for
`Refused to ... because it violates the ... Content Security Policy` errors:
- `/login` (unauthenticated)
- `/` dashboard (islands hydrate), `/portafolio`, `/timeline` (Recharts), `/pronosticos`,
  `/equipo` (tabs), `/cs360` (own `<html>`, AI HTML, charts), `/admin`
- Toggle theme (the pre-paint script), collapse the sidebar, change a filter (persisted prefs).

**Every** first-party violation must be resolved (usually: a script that should be hashed isn't, or a
directive is too tight). **Zero violations** is the pass bar. If a violation comes from a construct that
genuinely needs inline execution and can't be made static/hashable, STOP and report it rather than
re-adding `'unsafe-inline'`.

### Step 5: Tests + final verification

There's no unit test for an HTTP header policy that's meaningful in isolation; the gate is Step 4. But:
- If the middleware still builds a CSP string, add a small test asserting the enforced header name is
  `Content-Security-Policy` (not `-Report-Only`) and that `script-src` does NOT contain `'unsafe-inline'`.
  Put it in `tests/` mirroring the source (e.g. `tests/middleware/csp.test.ts`) only if the CSP string
  is exported as a pure value you can import without booting the middleware; if not, skip (don't
  contort the middleware just to test a constant) and note it.

**Verify**: `npm test` → all pass; `npx astro check` → 0; `npm run build` → 0.

## Done criteria

ALL must hold:
- [ ] No executable inline script has per-request dynamic content (perms moved to a JSON data island)
- [ ] Astro CSP enabled; all inline + hydration scripts covered by hashes
- [ ] The CSP the browser enforces on HTML pages is **enforced** (not Report-Only) and `script-src`
      has NO `'unsafe-inline'`
- [ ] `style-src 'unsafe-inline'` retained (documented as accepted residual)
- [ ] Exactly one authoritative `script-src` reaches the browser per HTML page (no double-block)
- [ ] Production-build click-through (Step 4) shows ZERO first-party CSP violations across all listed pages
- [ ] `npm test`, `npx astro check`, `npm run build` all green
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` follow-up note for CSP updated to DONE
- [ ] CLAUDE.md updated if the auth/security section documents the CSP posture (check
      `documentation/dev/arquitectura/seguridad.md` too)

## STOP conditions

Stop and report if:
- Astro's CSP support isn't available/compatible with the installed `astro@^6.2` + amplify adapter.
  Do NOT fall back to a hand-rolled nonce that can't cover hydration scripts.
- Any first-party CSP violation in the production preview can't be resolved without re-adding
  `script-src 'unsafe-inline'`.
- The perms data-island change alters timing such that `window.__PN_PERMS__` is undefined when a
  consumer reads it.

## Maintenance notes

- New inline `<script>` blocks must be **static** (so Astro can hash them). Any per-request dynamic
  value goes through a `<script type="application/json">` data island + a static reader — never
  `set:html` into an executable `<script>`.
- A future follow-up (separate plan): add `report-to`/`report-uri` so production CSP violations are
  observable, and consider tightening `style-src` if/when the inline-style sources are eliminated.
- If `npm run auth:generate` or an Astro upgrade changes header handling, re-run the Step 4
  click-through; CSP regressions are invisible until something is blocked.
