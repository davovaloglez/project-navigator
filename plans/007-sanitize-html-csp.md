# Plan 007: Sanitize CS360/Nexus HTML and enforce the Content-Security-Policy

> **Executor instructions**: Follow step by step. Run every verification command before moving on. On
> any "STOP condition", stop and report. When done, update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 34cffdc..HEAD -- src/middleware.ts src/components/sections/cs360/ src/components/sections/NovedadesSection.tsx`
> Re-read the dangerouslySetInnerHTML sites before editing.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `34cffdc`, 2026-06-19

## Why this matters

The CS360 module renders HTML from two not-fully-trusted sources directly into the DOM via
`dangerouslySetInnerHTML`: (a) AI-generated reports from the Nexus service (`ai.bit.lat`), and (b)
customer data (tickets/activities/audit "Magnum" HTML) imported from the external Samva export. There
is **no sanitization** (DOMPurify is not in the repo). The code comment even says *"sin sanitizar por
ahora; evaluar DOMPurify a futuro."* Meanwhile the app's CSP is **Report-Only** with
`script-src 'self' 'unsafe-inline'`, so it logs but does not block injected inline scripts — it
provides no actual mitigation. If the AI output or the export is ever poisoned, this is a stored-XSS
path on an admin surface. This plan adds real sanitization at the sink and tightens the CSP.

Note: this is partly a *documented deferral* — but a deferral on a security control with a live
injection source is exactly the kind of decision worth revisiting, and the audit surfaces it as
actionable, not settled.

## Current state

`dangerouslySetInnerHTML` sinks (verified at `34cffdc`):
- `src/components/sections/cs360/ResumenTab.tsx:391` — AI report HTML:
  ```tsx
  {aiEntry ? (
    // HTML confiable: viene de nuestro propio proxy de IA (decisión:
    // sin sanitizar por ahora; evaluar DOMPurify a futuro).
    <div dangerouslySetInnerHTML={{ __html: aiEntry.html }} />
  ) : ( ... )}
  ```
- `src/components/sections/cs360/TicketsTab.tsx`, `AuditoriaTab.tsx`, `ActividadesTab.tsx` — render
  backend-provided `descripcion`/`comentarios`/`contenido`/Magnum HTML.
- `src/components/sections/NovedadesSection.tsx` — renders HTML parsed from the repo's own
  `CHANGELOG.md`. This source IS trusted (shipped in the repo, not user/network input) — sanitizing
  it is harmless defense-in-depth but lower priority; include it for consistency.

`grep -rn "DOMPurify\|sanitize" src/` → no HTML sanitizer exists (only `sanitizePageSize`, unrelated).

The CSP (`src/middleware.ts:173`):
```ts
'Content-Security-Policy-Report-Only':
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://accounts.google.com; form-action 'self' https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests",
```

## Commands you will need

| Purpose   | Command            | Expected |
|-----------|--------------------|----------|
| Install   | `npm install`      | exit 0   |
| Typecheck | `npx astro check`  | exit 0   |
| Tests     | `npm test`         | all pass |
| Build     | `npm run build`    | exit 0   |

## Suggested executor toolkit

- DOMPurify is isomorphic but its server build needs care under SSR. Prefer sanitizing **at the
  render sink** (client component) where `window` exists, using `dompurify` directly. Docs:
  https://github.com/cure53/DOMPurify

## Scope

**In scope**:
- `package.json` — add `dompurify` (and `@types/dompurify` if needed for TS).
- `src/lib/sanitizeHtml.ts` (create) — a single `sanitizeHtml(raw: string): string` wrapper with an
  allowlist config.
- The 4 CS360 tab components + `NovedadesSection.tsx` — wrap each `dangerouslySetInnerHTML` value
  with `sanitizeHtml(...)`.
- `src/middleware.ts` — CSP tightening (Step 4 — see STOP conditions; this part is riskier).
- `src/lib/sanitizeHtml.test.ts` (create).

**Out of scope** (do NOT touch):
- The Nexus request/response plumbing (`src/lib/nexus.ts`, `analyze` endpoints) — sanitize at the
  render sink, not by rewriting the AI pipeline.
- Removing `'unsafe-inline'` from `style-src` — Tailwind/React inject inline styles; removing it will
  break styling. Leave `style-src` as-is. Only the `script-src` and Report-Only→enforce question is
  in scope, and only if Step 4's verification passes.

## Git workflow

- Branch: `advisor/007-sanitize-html-csp`
- Commit 1: `security(cs360): sanitize backend/AI HTML with DOMPurify`. Commit 2 (separate, so it can
  be reverted independently): `security: enforce CSP` — only if Step 4 succeeds.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add DOMPurify + the wrapper

Install `dompurify`. Create `src/lib/sanitizeHtml.ts`:
```ts
import DOMPurify from 'dompurify';

// Allowlist for backend/AI rich text: formatting + links, NO scripts/iframes/event handlers.
export function sanitizeHtml(raw: string): string {
  if (!raw) return '';
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['p','br','b','i','u','strong','em','span','div','ul','ol','li','a','h1','h2','h3','h4','table','thead','tbody','tr','td','th','code','pre','blockquote','hr','img'],
    ALLOWED_ATTR: ['href','title','class','style','target','rel','src','alt'],
    ALLOW_DATA_ATTR: false,
  });
}
```
Adjust the allowlist after Step 3's visual check so legitimate formatting from real payloads survives.

**Verify**: `npx astro check` → 0 errors.

### Step 2: Wrap each CS360 sink

In `ResumenTab.tsx:391` and the ticket/audit/activity tabs, change
`dangerouslySetInnerHTML={{ __html: X }}` to `dangerouslySetInnerHTML={{ __html: sanitizeHtml(X) }}`.
Remove the "sin sanitizar" comment. Do the same in `NovedadesSection.tsx`.

**Verify**: `grep -rn "dangerouslySetInnerHTML" src/components | grep -v "sanitizeHtml(" ` → returns
nothing (every sink is wrapped).

### Step 3: Visual sanity check

Run `npm run dev`, open the CS360 dashboard with real or mock data, and confirm AI reports + ticket
HTML still render with their intended formatting (tables, bold, links). If formatting is stripped,
widen `ALLOWED_TAGS`/`ALLOWED_ATTR` minimally — do not re-add `script`, `iframe`, `on*` handlers, or
`javascript:` hrefs. (DOMPurify blocks `javascript:` by default.)

**Verify**: rendered content looks correct; no console CSP/sanitizer errors.

### Step 4: Tighten the CSP (riskier — guard with Report-Only first)

Do NOT flip straight to enforced. Instead:
1. Keep `Content-Security-Policy-Report-Only` but tighten `script-src` toward removing
   `'unsafe-inline'`. Astro/React may need inline scripts (e.g. the theme/sidebar pre-paint inline
   `<script>` in `Layout.astro`). If those exist, a nonce is required to drop `'unsafe-inline'` —
   that is a larger change. If adding a nonce is not feasible in one pass, STOP and report; ship only
   the sanitization (Steps 1–3) and leave the CSP change for a dedicated follow-up.
2. If (and only if) the app works with the tightened policy in Report-Only with zero violations during
   a manual click-through, add an *enforced* `Content-Security-Policy` header alongside Report-Only,
   then in a later PR remove Report-Only.

**Verify**: with the tightened Report-Only CSP, click through `/`, `/login`, a few pages, and CS360;
check the browser console for CSP violation reports. Zero violations from first-party code → safe to
proceed; any violation → STOP and report which inline resource needs a nonce.

### Step 5: Tests + full verification

Add `src/lib/sanitizeHtml.test.ts`: assert that `<script>alert(1)</script>` and
`<img src=x onerror=alert(1)>` are stripped/neutralized, and that allowed formatting (`<b>`, `<a href>`,
`<table>`) survives. (DOMPurify needs a DOM — set this test file's environment to `jsdom`: add
`// @vitest-environment jsdom` at the top, and `npm install -D jsdom`.)

**Verify**: `npm test` → all pass; `npx astro check` → 0; `npm run build` → 0.

## Test plan

- New `src/lib/sanitizeHtml.test.ts` (jsdom env) — XSS payloads neutralized, safe markup preserved.
- Manual visual check (Step 3) is the regression gate for "did sanitization break real formatting".

## Done criteria

ALL must hold:
- [ ] `dompurify` added; `src/lib/sanitizeHtml.ts` exists
- [ ] Every `dangerouslySetInnerHTML` in `src/components` passes through `sanitizeHtml(...)`
- [ ] `npm test` passes incl. the sanitizer XSS tests
- [ ] `npx astro check` exits 0; `npm run build` exits 0
- [ ] CS360 content still renders correctly (manual check noted in report)
- [ ] CSP change either landed with zero first-party violations OR explicitly deferred with reason
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row for 007 updated

## STOP conditions

Stop and report if:
- Dropping `'unsafe-inline'` from `script-src` breaks the inline pre-paint scripts in `Layout.astro`
  and a nonce-based approach can't be completed in this pass. Ship Steps 1–3; defer the CSP enforce.
- Sanitization strips formatting that real payloads depend on and you cannot whitelist it without
  re-enabling a dangerous construct.
- DOMPurify fails to run under SSR/build (it should only run client-side at the render sink — if it's
  being imported into server code, that's the bug; keep it client-only).

## Maintenance notes

- New `dangerouslySetInnerHTML` usages must go through `sanitizeHtml`. Consider an ESLint rule or a
  grep check in CI (`grep dangerouslySetInnerHTML | grep -v sanitizeHtml` must be empty).
- The CSP enforce (vs Report-Only) is the higher-value follow-up once a nonce strategy exists; track it.
- A reviewer should verify the allowlist doesn't include `iframe`, `object`, `embed`, `form`, or event
  handler attributes.
