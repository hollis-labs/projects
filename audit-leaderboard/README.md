# Audit remediation raceboard

A dependency-free browser leaderboard for `findings.json`. It polls the source
every five seconds, ranks open findings by urgency, and provides filters plus a
detail view for evidence and recommendations.

## Run it

From the repository root, serve it next to a `findings.json`:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173/?data=findings.json>. Without `?data=`, the page reads `../findings.json`, i.e. the parent of the directory it is served from.

The page must be served over HTTP because browsers do not load JavaScript
modules and JSON reliably from `file://` URLs.

## Reuse it

Point the page at any compatible `findings.json` with the `data` URL parameter:

```text
http://localhost:4173/?data=../another-findings.json
```

The minimum accepted shape is:

```json
{
  "findings": [
    {
      "id": "EXAMPLE-001",
      "severity": "high",
      "summary": "Example finding",
      "task_status": "not-started",
      "disposition": "remediate"
    }
  ]
}
```

Optional fields are normalized safely. The richer Nanite fields—categories,
package, confidence, evidence, recommendation, files, task file, revalidation
note, and architect-decision flag—appear when present.

## Verify the ranking logic

```bash
node --test leaderboard.test.mjs
```

## License

MIT. See [LICENSE](./LICENSE).
