# acme-dashboard-spynejs

The SpyneJS arm of a measured AI-agent framework comparison: the same
dashboard product as the Next.js arm, evolved feature-by-feature by
fresh AI agent sessions from identical framework-neutral task
statements, measured at every step. This repo is the evidence — every
round, and every ablation run, is inspectable at the exact commits it
was measured at.

Live app: https://acme-dashboard.spynejs.com · demo login
`user@nextmail.com` / `123456`

## Provenance

A ground-up [SpyneJS](https://www.npmjs.com/package/spyne)
implementation of the product defined by Vercel's Next.js Learn
dashboard, evolved by AI agents as part of a measured comparison.
During the program, the building agents' framework context was the
SpyneJS Knowledge Base — served during the program; publication
forthcoming.

## The tag structure

Every scored round carries a `pre-<round>` and `post-<round>` tag, so
`git diff pre-B3..post-B3` shows exactly what the agent built for
that round:

| Round | Feature |
|---|---|
| B1 | Column sorting, URL-persisted |
| B2 | Inline status toggle + app-wide freshness guarantee |
| B3 | Global Cmd-K quick-search |
| B4 | Scale (5,000 invoices) + loading feedback |
| B5 | Real-time payments (SSE live feed) |
| P1 | Customers pagination (polish round, protocol-run, unscored) |
| P2-1 | Spreadsheet-grade bulk editing under live events |

## The ablation branches

Three `ablation/*` branches re-run round B3 with the Knowledge Base
WITHHELD — builders limited to public sources (the published npm
package and its readable source). Each starts from an orphan snapshot
commit (no readable history, so the builder can't mine prior-round
citations):

- `ablation/a1-b3` — the pilot run. **CONFOUNDED** by two harness
  defects (a citation-strip script that corrupted baseline code, and
  a session-memory isolation breach) — published unconditionally,
  defects and all, because instrument failures are results too.
- `ablation/a1-b3-v2` — clean run 1 (fixed harness, verified
  isolation). Tagged `ablation-a1-b3-clean1-post`.
- `ablation/a1-b3-v2-run2` — clean run 2, same condition, independent
  builder. Tagged `ablation-a1-b3-clean2-post`.

Both clean runs delivered full scope with disjoint architectures.

## Metrics and protocol

The task statements, acceptance criteria, seed fixtures, and counting
rules are published as a framework-neutral kit:
[benchmark-protocol](https://github.com/relevantcontext/benchmark-protocol).
Per-round metrics were counted from agent transcripts, never
self-reports.

- Article: forthcoming.
- Sibling arm: [acme-dashboard-nextjs](https://github.com/relevantcontext/acme-dashboard-nextjs)
- [relevantcontext.io](https://relevantcontext.io)

## License

MIT — see [LICENSE](LICENSE).
