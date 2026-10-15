# Audit leaderboard

A dependency-free browser leaderboard for an audit-remediation `findings.json`:
it polls the source every five seconds, ranks open findings by urgency, and
offers filters and a detail view. It is a static page — no server, build step or
package dependencies — and it is not an audit tool, a tracker or a findings
store; it only displays a file someone else produces.

## Start Here

- `README.md` — how to serve it, the minimum accepted `findings.json` shape and
  the optional fields.
- `leaderboard.js` — pure ranking and normalization logic (severity and
  disposition weights, `priorityScore`, `normalizeCatalog`). No DOM access.
- `app.js` — the browser app: polling, filters, rendering, the detail view.
- `index.html` and `styles.css` — markup and styling.
- `leaderboard.test.mjs` — tests for the ranking logic.

## Commands

```bash
node --test leaderboard.test.mjs            # ranking tests, no install needed
python3 -m http.server 4173                 # serve, then open http://localhost:4173/
```

The page must be served over HTTP: browsers do not load JavaScript modules or
JSON reliably from `file://` URLs.

## Boundaries

- Keep it dependency-free: no bundler, framework or npm packages. `package.json`
  exists only to mark the files as ES modules.
- Keep `leaderboard.js` free of DOM and network access so it stays testable with
  `node --test`; side effects belong in `app.js`.
- Unknown or missing finding fields must normalize safely rather than throw; the
  page should render whatever subset of the schema a source provides.
- Ranking weights (`SEVERITY_WEIGHT`, `DISPOSITION_WEIGHT`) change what a
  reader sees first. Change them deliberately and update the tests with the
  reason.

Open a pull request for changes; a maintainer will review it.
