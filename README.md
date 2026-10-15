# projects

Application and project code from Hollis Labs. One public repository, flat layout: every project is a top-level directory.

## Layout

```
<name>/            one directory per project, nothing else at the root
scripts/           import-repo, scan-public, check-layout
```

Projects are plain directories. There is no module or tag machinery here and no release script.

## Importing a repository

```sh
git switch -c import-<name>
export GIT_FILTER_REPO=/path/to/git-filter-repo   # if not on PATH
scripts/import-repo <path-or-url-of-source> [<name>]
scripts/check-layout
```

The import keeps the original commits, authors and dates (via `git filter-repo`) and merges them with a merge commit that
records the source name, its HEAD and its tags. Old tags are not carried; they are listed in the merge commit message.
It stops, writing nothing, when the source history holds a file over 10 MiB, a submodule or Git LFS, and when the full-history
`scripts/scan-public` scan finds anything that must not be public. Both need an owner decision. Clean break: no shims,
redirects or stubs; the original repository is deleted by its owner afterwards.

## Public hygiene

`scripts/scan-public` scans the tree and every commit for secrets, internal hosts and addresses, and personal paths.
Allowlisted findings are still printed. Entries live in `scan-public.allow.d/<name>.allow` as `RULE-ID PATH-GLOB REASON`;
a reason describes why and never quotes a value or an address.

## License

MIT. See [LICENSE](LICENSE).
