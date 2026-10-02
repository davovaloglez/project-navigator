---
description: Sync the documentation under documentation/ with recent source changes. Invokes the docs-keeper subagent on the current diff (or a specified scope).
allowed-tools: Bash(git diff *), Bash(git status *), Bash(git log *), Bash(git ls-files *), Bash(git show *), Read, Glob, Grep, Agent
argument-hint: [scope]    # optional: "branch" (vs main), "staged", "working" (default), or a path
---

Use the `docs-keeper` subagent to review and update the documentation under `documentation/` so it stays in sync with the code under `src/`.

## Scope resolution

The user passed: `$ARGUMENTS`

- If empty or `working`: scope is **working tree vs HEAD** (`git diff --name-only HEAD` + untracked files in `src/`).
- If `staged`: scope is **staged changes** (`git diff --name-only --cached`).
- If `branch`: scope is **current branch vs main** (`git diff --name-only $(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD origin/master)...HEAD`).
- If a path: scope is just that path.

Compute the file list yourself first by running the matching `git` command, then **delegate to the `docs-keeper` subagent** with:

- The list of changed source files (filtered to `src/components/sections/`, `src/utils/`, `src/hooks/`, `src/pages/api/`, `src/data/glossary.ts`, `src/middleware.ts`, `src/lib/`, `src/db/`, `src/components/ui/`, `src/components/charts/`, `vercel.json`, `.env.example`).
- The explicit instruction: "Read documentation/COMO-DOCUMENTAR.md first, then for each file in the list verify the corresponding doc(s) and propose edits."

If the filtered list is empty, **don't invoke the agent**. Just tell the user "no source files in tracked directories have changed; docs are presumably in sync. Run with `branch` to widen scope, or pass a path explicitly."

## After the agent finishes

Show the user the agent's final summary (files updated, files created, validator result). If the validator failed, point at the broken links so the user can investigate.

Do not commit the changes. Leave the working tree dirty so the user can review with `git diff documentation/` and stage selectively.
