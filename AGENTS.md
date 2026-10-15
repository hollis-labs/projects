# projects

Application and project repositories from Hollis Labs, in one public repository. Each project lives in its own top-level directory `<name>/`, as a plain directory: no Go module machinery here, no per-project tags, no release script. A project may carry its own `go.mod` or build files; they are its own.

It is not: a place for libraries, standalone tools or retired code.

## Start Here

- `README.md` - what this repository is and how to use it.
- `<name>/` - one top-level directory per imported repository. Code arrives through `scripts/import-repo`.
- `scripts/` - all tooling (`repo.conf` holds the per-repository settings).
- `scan-public.allow.d/` - owner-reviewed allowlists for the public-hygiene scan, one `<name>.allow` per imported repository.
- `.github/workflows/` - `guards.yml` runs layout and scan-public on every push and pull request. There is no build job.

## Commands

```sh
scripts/check-layout                          # layout guard
scripts/scan-public                           # secrets / hosts / private paths, tree and history
scripts/scan-public --source <path-or-url>    # scan a repository before importing it
scripts/import-repo [--target DIR] <source> [<name>]
```

## Boundaries

- Bring code in with `scripts/import-repo <source> [<name>]`, not by copying files, so history survives. It lands at `<name>/` at the repository root (flat, no groups), keeping original commits, authors and dates, and merges with a merge commit that records the source name, its HEAD and its tags. Old tags are not carried; they are listed in the merge commit message. Work on a branch, not main; set `GIT_FILTER_REPO` if `git-filter-repo` is not on PATH.
- Stop conditions. `scripts/import-repo` refuses, before writing anything, a source whose history (any commit, any ref) holds a file over 10 MiB, a submodule (`.gitmodules` or a gitlink) or Git LFS. These need an owner decision; there is no override flag. Do not work around them (no squashing, no history rewrite of the source) without that decision.
- Clean break: no shims, redirects, aliases, deprecation stubs or transitional re-exports. The original repository is deleted by the owner after the import; nothing here points back at it.
- This repository is public. Nothing secret, no token, internal host name, internal address or personal path may enter a file, a commit message or CI config. `scripts/import-repo` scans the source (tip and every commit) with `scripts/scan-public` first, and a finding stops the import. Allowlist entries (`RULE-ID PATH-GLOB REASON`, in `scan-public.allow.d/<name>.allow`) are owner-reviewed; the reason says why, and never quotes a secret value or a literal address. `scripts/check-layout` rejects entries without a reason.
- Every project is a top-level directory and nothing else sits at the root except `AGENTS.md`, `README.md`, `LICENSE` and `.gitignore`. No `go.work` anywhere. Guard: `scripts/check-layout`.
- No module or tag machinery: this repository has no release script and no tags per project.
- After an import, the project's own `AGENTS.md`, `CLAUDE.md`, `LICENSE` and `lefthook.yml` are dropped (history keeps them). Nothing else is rewritten.
- Documentation names, in prose, only things a stranger can see in this repository or on the public Hollis Labs organization.

## Do Not

- Add a `CLAUDE.md`; `AGENTS.md` is the single instruction file.
- Create the GitHub repository, push, or tag on your own; those are the owner's steps.
- Copy files in by hand instead of importing, or import a repository that tripped a stop condition.
