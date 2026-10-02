---
name: release
description: Create a new release following gitflow via PRs (validate, branch, version bump, changelog, push, open PRs to master and develop)
disable-model-invocation: true
argument-hint: "version e.g. 1.2.0"
---

# Release v$ARGUMENTS

Execute the full release process for version **$ARGUMENTS** following the project's gitflow.

**Branch protection:** direct pushes/merges to `master` and `develop` are blocked. This command prepares the `release/v$ARGUMENTS` branch and opens **two PRs** (→ `master` and → `develop`). A reviewer merges them; the version tag is created **after** the master PR is merged.

## Pre-flight

1. Confirm you are on the `develop` branch and working tree is clean (`git status`)
2. Run `npm run build` — must complete with 0 errors
3. Run `npx astro check` — must report 0 errors, 0 warnings, 0 hints
4. If any check fails, STOP and report the issue. Do NOT proceed with a broken build.

## Create release branch

```
git checkout -b release/v$ARGUMENTS
```

## Update version

- Update `"version"` in `package.json` to `$ARGUMENTS`

## Update CHANGELOG.md

- Add a new `## [$ARGUMENTS] - YYYY-MM-DD` section at the top (below the `# Changelog` header, above the previous version)
- Review all commits since the last release tag: `git log --oneline $(git describe --tags --abbrev=0)..HEAD`
- Categorize changes under `### Added`, `### Changed`, `### Fixed` as appropriate
- Write concise, human-readable descriptions grouped by feature area

## Update CLAUDE.md

- If new pages, endpoints, or conventions were added, update the corresponding tables

## Commit release

```
git add package.json CHANGELOG.md CLAUDE.md
git commit -m "chore: release v$ARGUMENTS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> **Order matters.** Resolve any conflict with `master` and open the master PR **first**. Only once the master side is clean do you create the develop branch and PR. Each PR gets its **own** head branch (the repo auto-deletes head branches on merge; sharing one branch would force-close the other PR unmerged).

## Reconcile with master & resolve conflicts

Bring `master` into the release branch so the master PR will merge cleanly. Do this on `release/v$ARGUMENTS` (you should already be on it):

```
git fetch origin master
git merge --no-ff origin/master -m "Merge master into release/v$ARGUMENTS"
```

- **No conflicts** (clean merge or "Already up to date") → continue.
- **Conflicts** → resolve them carefully and correctly:
  1. Run `git status` to list conflicted files.
  2. Open each conflicted file and reconcile both sides on their merits — understand what master changed vs. what the release branch changed; do NOT blindly pick one side.
  3. For `package.json` `"version"` and the `CHANGELOG.md` top section, **keep the release values for $ARGUMENTS** (the release is authoritative for the version bump and its changelog entry); fold in any other legitimate master changes.
  4. After resolving: `git add <files>`, verify with `git diff --cached`, then `git commit --no-edit` (or a clear merge message).
  5. **Re-validate** after resolution: `npm run build` and `npx astro check` must still pass with 0 errors. If they fail, fix or STOP and report — never open a PR on a broken merge.

Push the reconciled release branch:

```
git push -u origin release/v$ARGUMENTS
```

## Open the master PR

```
gh pr create --base master --head release/v$ARGUMENTS \
  --title "Release/v$ARGUMENTS" \
  --body "$(cat <<'EOF'
## Release v$ARGUMENTS

Release to **master**. Once merged, tag the merge commit (see release notes below).

### Changelog
<paste the new CHANGELOG.md section for $ARGUMENTS here>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Do **not** merge it — a reviewer does that. Confirm `gh pr view --json mergeable` does not report `CONFLICTING`; if it does, resolve as above and re-push before continuing.

## Create the develop branch & open its PR (only once master is clean)

Create the develop head branch from the **reconciled** release commit, push it, and open the PR. Doing this after the master reconciliation means develop inherits the same conflict-free state.

```
git branch release/v$ARGUMENTS-develop release/v$ARGUMENTS
git push -u origin release/v$ARGUMENTS-develop

gh pr create --base develop --head release/v$ARGUMENTS-develop \
  --title "Release/v$ARGUMENTS → develop" \
  --body "$(cat <<'EOF'
## Sync release v$ARGUMENTS into develop

Brings the version bump and CHANGELOG entry from release/v$ARGUMENTS back into **develop**.
Independent of the master PR (separate head branch) so it survives the master merge + auto-delete.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

If the develop PR reports conflicts (`gh pr view release/v$ARGUMENTS-develop --json mergeable`), reconcile `origin/develop` into `release/v$ARGUMENTS-develop` the same way and re-push.

Capture and report the two PR URLs that `gh` prints.

## Tag (post-merge — do NOT do it now)

The tag must point at the **merge commit on master**, which doesn't exist until the master PR is merged by a reviewer. Print these commands for the user to run **after the master PR is merged**:

```
git checkout master
git pull origin master
git tag -a v$ARGUMENTS -m "v$ARGUMENTS"
git push origin v$ARGUMENTS
```

## Verify

- Run `gh pr view release/v$ARGUMENTS --json mergeable,url` — must NOT be `CONFLICTING`
- Run `gh pr view release/v$ARGUMENTS-develop --json mergeable,url` — must NOT be `CONFLICTING`
- Run `gh pr list --head release/v$ARGUMENTS` and `gh pr list --head release/v$ARGUMENTS-develop` to confirm both PRs are open
- Confirm working tree is clean

## Report

Print a summary table:

| Step | Status |
|---|---|
| Build | result |
| astro check | result |
| Branch release/v$ARGUMENTS | created + pushed |
| Reconcile with master | clean / conflicts resolved |
| Re-validate after merge | build + check result |
| PR → master | opened (URL), mergeable |
| Branch release/v$ARGUMENTS-develop | created + pushed |
| PR → develop | opened (URL), mergeable |
| package.json | updated to $ARGUMENTS |
| CHANGELOG.md | entry added |
| CLAUDE.md | updated if needed |
| Tag v$ARGUMENTS | pending (after master PR merges) |

Then remind the user:
- Review and merge the **master** PR first, then run the tag commands above.
- Merge the **develop** PR (order doesn't matter — separate branches).

## Important

- ALWAYS reconcile and resolve conflicts with `master`, and open the **master** PR, BEFORE creating the develop branch/PR
- When resolving conflicts, reconcile both sides on their merits — never blindly pick one side; keep the release version/changelog for $ARGUMENTS
- ALWAYS re-run build + `astro check` after resolving a merge conflict; never open a PR on a broken merge
- NEVER merge the PRs automatically — a reviewer approves and merges them
- NEVER create or push the tag during this command — it must wait for the master PR merge
- NEVER skip the build/check validation
- NEVER amend existing commits — always create new ones
- ALWAYS use two distinct head branches (master/develop) so PR auto-delete can't force-close the other PR
- If `release/v$ARGUMENTS` or `release/v$ARGUMENTS-develop` already exists (locally or on origin), STOP and ask the user
- Use the current date (today) for the CHANGELOG entry
