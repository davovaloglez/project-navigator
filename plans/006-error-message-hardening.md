# Plan 006: Stop leaking raw `error.message` from API endpoints

> **Executor instructions**: Follow step by step. Run every verification command before moving on. On
> any "STOP condition", stop and report. When done, update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 34cffdc..HEAD -- src/pages/api/`
> Re-run the grep in Step 1 to get the current list of offending sites.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `34cffdc`, 2026-06-19

## Why this matters

About 17 API endpoints catch errors and return the raw `error.message` to the client in the JSON
response body. That message can carry internal detail — Google Sheets API errors (ranges, sheet
names), Turso/libSQL error strings, Nexus service errors — which aids reconnaissance and exposes the
data-source internals to any authenticated caller. The fix is to return a generic message to the
client while logging the full error server-side for debugging. Low risk, clean, and high consistency
value.

## Current state

The repeated pattern (example, `src/pages/api/proyectos.ts:157-163`, verified at `34cffdc`):
```ts
} catch (error) {
  const message = error instanceof Error ? error.message : 'Error desconocido';
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
```
`grep -rln "error instanceof Error ? error.message" src/pages/api` → **17 files** at `34cffdc`.

The app already returns localized error JSON elsewhere with a `{ error, code }` shape (see
`src/middleware.ts` `forbiddenJson()` / `unauthorizedJson()`). Match that shape for consistency.

## Commands you will need

| Purpose   | Command                                                        | Expected |
|-----------|---------------------------------------------------------------|----------|
| List sites| `grep -rln "error instanceof Error ? error.message" src/pages/api` | the 17 files |
| Typecheck | `npx astro check`                                             | exit 0   |
| Build     | `npm run build`                                               | exit 0   |
| Tests     | `npm test`                                                    | all pass |

## Scope

**In scope**:
- `src/lib/apiError.ts` (create) — a `serverErrorResponse(error, context)` helper that logs the full
  error server-side and returns a generic 500 JSON.
- The ~17 `src/pages/api/*.ts` files that currently return `error.message`.

**Out of scope** (do NOT touch):
- 4xx responses that intentionally return a *validation* message the client needs (e.g.
  "periodo inválido", `NO_EQUIPO`). Those are user-facing contract messages, not internal leaks —
  leave them. Only replace the `catch (error) → error.message` 500 paths.
- `middleware.ts` — its JSON helpers are already generic; leave them.
- The error/loading handling in `useSheetData` and React components.

## Git workflow

- Branch: `advisor/006-error-message-hardening`
- Commit: `security(api): return generic 500s, log full error server-side`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Enumerate the exact sites

Run `grep -rn "error instanceof Error ? error.message" src/pages/api`. Record the file list. This is
the authoritative set to change.

### Step 2: Create the helper

`src/lib/apiError.ts`:
```ts
export function serverErrorResponse(error: unknown, context: string): Response {
  // Log the full error server-side for debugging (visible in Amplify/CloudWatch logs).
  console.error(`[api:${context}]`, error);
  return new Response(
    JSON.stringify({ error: 'Ocurrió un error al procesar la solicitud.', code: 'INTERNAL_ERROR' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } },
  );
}
```

**Verify**: `npx astro check` → 0 errors.

### Step 3: Replace each catch block

In each file from Step 1, replace the body of the `catch (error) { ... }` that returns
`error.message` with `return serverErrorResponse(error, '<route-name>');` (use the route filename as
context, e.g. `'proyectos'`). Import the helper. Remove the now-unused local `message` variable.

Do them in small commits. After each file: `npx astro check` → 0 errors.

### Step 4: Confirm no raw leaks remain

**Verify**:
- `grep -rn "error instanceof Error ? error.message" src/pages/api` → returns nothing (or only sites
  you deliberately left with a justification noted in your report).
- `grep -rn "JSON.stringify({ error: message })" src/pages/api` → returns nothing.

### Step 5: Full verification

**Verify**: `npx astro check` → 0; `npm run build` → 0; `npm test` → all pass.

## Test plan

- No new unit tests strictly required (this is a response-shape hardening with no pure-function to
  test). Optional: a tiny test of `serverErrorResponse` asserting the body has no `error.message`
  passthrough and status 500. If you add it, model after plan 001's test files.
- Manual check: trigger one endpoint's catch path mentally — confirm the client now sees the generic
  body and the full error is `console.error`'d.

## Done criteria

ALL must hold:
- [ ] `src/lib/apiError.ts` exists and is used by all previously-offending endpoints
- [ ] `grep -rn "error instanceof Error ? error.message" src/pages/api` returns nothing (or only
      justified exceptions)
- [ ] `npx astro check` exits 0; `npm run build` exits 0; `npm test` passes
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row for 006 updated

## STOP conditions

Stop and report if:
- A catch block's `error.message` is actually surfaced to the user as a meaningful, expected message
  (not an internal leak) — leave it and note it.
- An endpoint already logs + returns generic (already fixed) — skip it.

## Maintenance notes

- New API routes should use `serverErrorResponse` in their catch blocks from the start — consider
  noting this convention in `CLAUDE.md` under "Code Conventions".
- A reviewer should confirm no 4xx validation message was accidentally genericized (those are part of
  the API contract).
