# PDF Import & Competitor-Aware Scheduling

**Status**: current as of 2026-09-15, verified against the running app
(see `documents/ELECTRON_CLICK_TESTING_SETUP.md` for how)

## What this solves

The full race catalog has ~2,400 races; a given competition only actually
runs 40-80 of them. Uploading the competition's official entry-list PDF
lets the app filter down to just those races, and additionally know *which
competitors* are in each one — enabling conflict detection based on real
entries ("this specific person is in both races, 20 minutes apart") rather
than only generic rule violations ("these two race categories usually need
separation").

## Pipeline

```
PDF file → idorendmaker-pdfprocessor (parse) → idorendmaker-backend (match + persist) → filtered schedule builder
```

1. **Parse** (`idorendmaker-pdfprocessor`, stateless): `POST /versenyszam/extract`,
   `VersenyszamNevezesekExtractor` does positional-text extraction tuned to
   the official MKKSZ entry-list layout. Returns race name + competitor list
   per race; nothing is persisted here.
2. **Match + persist** (`idorendmaker-backend`, `RaceMatchingServiceImpl`,
   `POST /api/pdf/process-and-match`): matches each extracted race name
   against the catalog (exact-name matching with a confidence score — not
   fuzzy/Levenshtein in the current implementation, despite what an older
   archived doc describes), then persists `PDFExtraction` +
   `CompetitorEntry` + `RaceCompetitorAssociation` rows in `user.db`.
   Deduplicates by SHA-256 file hash — re-uploading the same file reuses
   the existing extraction instead of reprocessing.
3. **Filter** (`GET /api/pdf/extractions/{id}/filtered-races`): returns only
   catalog races that have at least one matched entry, each annotated with
   entry count and a competitor-name preview.
4. **Schedule** (`ScheduleBuilder` with `pdfExtractionId` set): the race
   list on the left is the filtered set instead of the full catalog;
   `CompetitorTracker` (right panel) becomes active.

## Extraction lifecycle

`PDFExtraction.status`: `session` (just processed, expires in 24h if
never saved into a schedule) → `linked` (a schedule referencing this
extraction was saved — permanent from then on) → `archived` (defined,
currently unused). Expired `session` rows are cleaned up automatically on
app startup (`RaceMatchingController`'s cleanup call from `main.ts`).
Loading a saved schedule that has a `pdfExtractionId` restores full
competitor-aware context automatically.

## UI flow (`components/pdf/`)

`PDFManager.tsx` is the orchestrator: left panel `PDFExtractionList`
(previously-processed extractions, clickable cards — **not** gated by the
native file dialog, this is how automated testing can reach it), right
panel is either `PDFExtractionDetails` (an extraction selected — shows
stats, match rate, a live-loading matched-races preview, and "Időrend
készítése" to continue) or `PDFUploadPanel` (no extraction selected — the
"select a new file" + "process" flow).

**The native file picker itself (`window.electronAPI.pdfSelectFile()` →
`dialog.showOpenDialog`) cannot be driven by CDP/Playwright** — it's an OS
dialog, not a web element. `pdfProcessAndMatch(filePath: string)` is a
**separate** IPC call decoupled from the dialog step; calling it directly
with a known path exercises the real pipeline (verified live: a real
competition PDF, 46 races / 293 competitors / 487 entries extracted and
matched correctly, 83% match rate against the catalog). See the testing
skill for the exact technique.

## Competitor conflict analysis (`CompetitorTracker.tsx` + backend `CompetitorService`)

For each competitor with 2+ entries in the current schedule, computes the
interval between their races and classifies risk: `low` / `medium` /
`high` based on recovery time relative to estimated race duration.

**Heat "worst-case" logic**: a competitor entered in a race that has
multiple heats at the same level type (e.g. I. Előfutam and II. Előfutam of
the same race) is not actually in *every* heat — they're in exactly one,
just not known which until heats are drawn. The analysis groups by
`(raceCode, levelType)` and picks the heat combination that produces the
tightest (worst-case) interval, rather than either ignoring the ambiguity
or falsely flagging conflicts across heats the competitor was never
simultaneously in.

## Boat-unit counts (Excel export + race list display)

Entry count alone overcounts multi-seat boats (a K2 with 2 competitors is
one boat, not two). `ExportService.calculateBoatUnits(entryCount,
seatCount)` divides and rounds up; `seatCount` comes from the catalog's
`boat_classes.seat_count` live, or from a schedule item's
`race_seat_count` snapshot column for a saved/reloaded schedule (see
`documents/ARCHITECTURE.md`'s snapshot section — this is exactly the kind
of value that would silently break if the snapshot columns aren't kept in
sync with what the catalog actually has).

## Key files

| | |
|---|---|
| PDF parsing | `idorendmaker-pdfprocessor/src/main/java/.../extractor/VersenyszamNevezesekExtractor.java` |
| Matching + persistence | `idorendmaker-backend/.../service/impl/RaceMatchingServiceImpl.java`, `RaceMatchingController.java` |
| Competitor analysis | `idorendmaker-backend/.../service/impl/CompetitorServiceImpl.java`, `CompetitorController.java` |
| Frontend orchestration | `idorendmaker-desktop/src/components/pdf/PDFManager.tsx` |
| Frontend competitor UI | `idorendmaker-desktop/src/components/pdf/CompetitorTracker.tsx` |
| Rule-engine integration | `idorendmaker-desktop/src/features/rules/utils/ruleEngine.ts` — `CompetitorAwareRuleProcessor` (see `documents/RULE_ENGINE.md`) |
