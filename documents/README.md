# Documentation index

Start at the repo root instead if you haven't: **[`CLAUDE.md`](../CLAUDE.md)**
(agent/technical orientation) or **[`README.md`](../README.md)** (human
quick-start). This file is just an index of what's in this directory.

## Current (verified against the codebase, not carried over from an older doc)

| Doc | Covers |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Full technical reference: catalog/user DB split, entity conventions, IPC surface, build pipeline |
| [`RULE_ENGINE.md`](RULE_ENGINE.md) | Conflict-detection rule system: fields, operators, matching, violation semantics |
| [`PDF_AND_COMPETITOR_TRACKING.md`](PDF_AND_COMPETITOR_TRACKING.md) | PDF entry-list import → race matching → competitor conflict analysis |
| [`ELECTRON_CLICK_TESTING_SETUP.md`](ELECTRON_CLICK_TESTING_SETUP.md) | How to launch and click through the real running app for testing (see also `.claude/skills/run-desktop/`) |
| [`INTERVAL_SYSTEM.md`](INTERVAL_SYSTEM.md) | The races-with-intervals-between-them mental model (conceptual, still accurate) |
| [`idorend-design-system.md`](idorend-design-system.md) | UI layout conventions: 3-layer navigation, spacing, component patterns |
| [`../idorendmaker-db-populator/CATALOG_UPDATE_GUIDE.md`](../idorendmaker-db-populator/CATALOG_UPDATE_GUIDE.md) | How to regenerate `catalog.db` when official race data changes |

## Reference data (not documentation — inputs the catalog populator reads)

`versenyszamok.xlsx`, `Futamszint.txt`,
`Hajoosztaly_Hajoosztaly-tipus_Hajoosztaly-ulesszam.txt`,
`tovabbjutas_uj_magyar_bajnoki_9_palyas.txt`, `Új Magyar Bajnoki 9 pályás.xlsx`,
`kayaker.png` / `.svg`. Leave these where they are; they're source data,
not docs to prune.

## `archive/`

Historical design docs. Each carries a banner at the top explaining why it
was archived and pointing at its current replacement, where one exists.
**Read them for narrative/rationale, never for a current fact** (a schema,
a file path, a line count) — several were written against an architecture
(single SQLite database, numeric `Integer id` primary keys, a custom
`MigrationRunner`) that no longer exists. If you're not sure whether
something in an archived doc is still true, check the actual source before
repeating it.
