# Időrend Készítő — agent orientation

Desktop app (Electron + React) for building race-day schedules for Hungarian
kayak/canoe competitions. Two Spring Boot JARs do the real work; Electron is
a thin supervisor + UI shell around them.

**Read this file first in any new session.** It's the map. Deeper, still-current
detail lives in `documents/` (listed at the bottom) — go there for specifics,
not for "what is this project."

If you're about to do exploratory work (understand a feature, plan a fix,
verify current state), consider whether it's worth spinning up a fresh
context via the `Explore`/`general-purpose` agent for the search itself, but
there's no substitute for reading this file's "Traps for a new agent" section
first — every item there was a real mistake made in an actual session.

## What's actually true right now

The project went through a large architectural migration
(GraalVM native → Spring Data JPA, then a single SQLite DB → split
catalog/user databases with `Integer id` → `String code` everywhere) that
**invalidated most of the pre-2026 documentation in `documents/`**. Anything
you find via web search, old memory, or a doc without a 2026 date is
suspect — verify against the actual source before trusting it. See
"Documentation map" below for what's current.

## Tech stack

| Layer | Stack |
|---|---|
| Desktop shell | Electron 37, React 19, TypeScript 5.3, Vite, shadcn/ui + Tailwind |
| Main backend | Spring Boot 3.4.5, Java 23 (Temurin), Spring Data JPA (Hibernate 6.6), Liquibase, MapStruct, Lombok |
| PDF processor | Spring Boot 3.4.5, Java 23, Apache PDFBox — separate JAR, stateless, no DB |
| Database | SQLite, **two files**: `catalog.db` (read-only race/level/boat-class reference data) + `user.db` (schedules, rules, PDF extractions — Liquibase-managed) |
| Build | Maven (backend, pdfprocessor), Electron Forge + NSIS (desktop), root `scripts/*.js` orchestrate all three |

## Repo layout

```
idorendmaker-backend/       Spring Boot JAR — schedules, rules, catalog reads, PDF-match, catalog update
idorendmaker-pdfprocessor/  Spring Boot JAR — PDF → structured entry data, nothing else
idorendmaker-desktop/       Electron app (main + preload + React renderer)
idorendmaker-db-populator/  TypeScript script that builds catalog.db from documents/versenyszamok.xlsx
idorendmaker-scripts/       One-off data-prep scripts (Excel dedup, etc.)
documents/                  Docs (see map below) + reference data files the populator reads
.claude/skills/run-desktop/ Click-through testing driver for the real running app (see below)
scripts/                    Root-level build orchestration (build-backend.js, build-pdfprocessor.js, ...)
```

### Backend package structure (`idorendmaker-backend/src/main/java/hu/szabolcst/idorendmaker/`)

- `model/entity/catalog/` — catalog entities (`Race`, `BoatClass`, `BoatType`, `AgeGroup`, `Level`, `RaceAgeGroup`, `CatalogMeta`), all with **`String code`** primary keys, read from `catalog.db`
- `model/entity/` (not under `catalog/`) — user entities (`Schedule`, `ScheduleSection`, `ScheduleItem`, `Rule`, `RuleCondition`, `RuleMatching`, `PDFExtraction`, `CompetitorEntry`, `RaceCompetitorAssociation`, ...), `Integer id` PKs, read/write to `user.db`
- `repository/catalog/` vs `repository/` — same split; catalog repos extend `Repository<T, String>` (no save/delete, it's read-only); user repos extend `JpaRepository<T, Integer>`
- `config/CatalogDataSourceConfig.java` / `UserDataSourceConfig.java` / `SqliteDataSourceFactory.java` — the two-datasource wiring. Cross-database references are stable string codes, never a JPA `@ManyToOne` — SQLite files can't join each other
- `service/RaceCatalogLookupService.java`, `service/ScheduleItemSnapshotPopulator.java` — the bridge: user-side services that need catalog data go through these, annotated `@Transactional(..., transactionManager = "catalogTransactionManager")`

**Why the snapshot columns on `schedule_items` matter**: a saved schedule item denormalizes race name/discipline/gender/distance/boat-class-name/**boat-class-code/boat-type-code/seat-count/seat-count-text**/age-groups-display/level-name/level-type onto itself (`ScheduleItemSnapshotPopulator`, changesets `0001`+`0002`). This is deliberate — a saved schedule keeps showing what it was built with even after a catalog update, and it's what the rule engine's `boatType`/`seatCount` conditions and the Excel export's boat-unit count actually read for a *loaded* schedule. If you add a new catalog-derived display field to `ScheduleItem`, it needs a Liquibase changeset + populator update + frontend `raceFromSnapshot()` update (`idorendmaker-desktop/src/utils/scheduleItemSnapshot.ts`) — three places, not one.

### Frontend structure (`idorendmaker-desktop/src/`)

- `components/` — presentational, organized by feature folder (`app/`, `schedule/`, `rules/`, `pdf/`, `race/`, `ui/` for shadcn primitives)
- `features/<domain>/hooks/`, `features/<domain>/services/`, `features/<domain>/utils/` — the actual logic. `features/schedule/hooks/useScheduleSectionData.ts` is the single most load-bearing file in the frontend (owns the in-memory schedule-being-built state); `features/rules/utils/ruleEngine.ts` is the client-side rule evaluator
- `data/services/BackendAPIService.ts` — every HTTP call to the main backend JAR goes through here
- `main.ts` / `preload.ts` — Electron main process + the `contextBridge`-exposed `window.electronAPI` surface. **`window.electronAPI` is frozen by contextBridge** — you cannot monkey-patch its methods from the renderer (assignment silently no-ops, doesn't throw)
- `shared/types/race.ts` — the TypeScript type definitions mirroring backend DTOs (all string-code based now, not numeric IDs)

### Process model

Electron's main process spawns both backend JARs as child processes on startup (`features/common/services/BackendService.ts`, `PDFProcessorService.ts`), each on a dynamically-picked local port, and the renderer talks to them over plain HTTP via axios (not IPC, except for the thin wrapper methods in `main.ts` that just forward to `BackendAPIService`). Both services resolve their JAR path via `devJarResolver.ts` (scans `target/` for whatever versioned jar Maven actually produced — don't hardcode a jar filename, see #62's history).

## Domain glossary (Hungarian ⇄ English)

| Hungarian | Meaning |
|---|---|
| Verseny | Competition |
| Versenyszám | Race (e.g. "K1 Férfi 500m") |
| Futam | Heat |
| Futamszint | Competitive level of a heat — Előfutam (preliminary) → Középfutam (semifinal) → Döntő (final) |
| Hajóosztály | Boat class (e.g. "Kajak egyes" = K1) |
| Korosztály | Age group |
| Időrend | Schedule/timetable — the thing the app produces |
| Szabály | Rule (the conflict-detection kind, "races A and B need N minutes apart") |
| Nevezés | Entry (a competitor entered in a race) |

## Building, running, testing

```bash
# Backend / pdfprocessor JARs (needed before any dev run of the desktop app)
cd idorendmaker-backend && ./mvnw clean package -DskipTests
cd idorendmaker-pdfprocessor && ./mvnw clean package -DskipTests

# Backend unit tests (small — see Known gaps)
cd idorendmaker-backend && ./mvnw test

# Frontend typecheck + lint (no test runner exists yet — see Known gaps)
cd idorendmaker-desktop && npx tsc --noEmit -p tsconfig.json
cd idorendmaker-desktop && npm run lint

# Click through the real running app - see .claude/skills/run-desktop/SKILL.md
```

**To actually launch and click through the app** (verify a UI change works, not
just typechecks): use the `.claude/skills/run-desktop/` project skill — do
not try to rediscover this from scratch. `electron-forge start` alone does
not work in this dev environment (exits silently before `app.on('ready')`,
root cause unknown); the skill documents the working sequence.

## Known gaps (filed, not fixed — check before re-discovering)

- **No CI** — nothing builds/typechecks/tests a PR automatically (#57)
- **Almost no test coverage** — one backend test class (`CatalogVersionsTest`), zero frontend tests, no test runner configured for the desktop app (#58)
- **Catalog update flow (`CatalogUpdateService`) is backend-only** — no manifest published, no frontend UI calls it (#55); and it closes the catalog `EntityManagerFactory` on update without rebuilding it (#56)
- **Age groups on `schedule_items`** are snapshotted by display name only, no stable code column (#59, low-prio)
- Full current list: `gh issue list --state open` in this repo, or the GitHub Issues tab

## Traps for a new agent (each cost real time in a real session — don't repeat them)

- **`git status`/`git log` before trusting a "current state" doc.** This repo had multiple large docs confidently describing an architecture (single DB, numeric IDs, a `MigrationRunner`) that no longer exists. A doc's own "Last Updated" header is not reliable — check the actual code.
- **`window.electronAPI` cannot be monkey-patched** from the renderer to intercept/count calls — `contextBridge.exposeInMainWorld` freezes it; the assignment silently no-ops rather than throwing, so a naive patch-and-count attempt always reports zero and looks like it worked. Intercept `console.log` instead if you need to observe what fired (see the testing skill).
- **`electron-forge start` silently dies** in this dev environment before `app.on('ready')`, zero diagnostic output. It's not your change — it happens on a clean checkout too. Build via it (it does build successfully first), then launch `electron.exe` directly. Full sequence in the testing skill.
- **Native OS dialogs (`dialog.showOpenDialog`) are unreachable from CDP/Playwright** — they're not a web element. If a flow needs a file picker, look for a lower-level IPC method that takes a raw path directly (there usually is one, decoupled from the dialog step) rather than assuming the flow can't be tested headlessly.
- **Race/level/boat-class references are `String code`, not `Integer id`**, everywhere in current code (frontend types, backend entities, DTOs). Any snippet, memory, or doc using `race.id` / `level_id` / `raceId: number` is describing the pre-migration schema.
- **A `setState` updater that always returns a new object/array is a real performance bug**, not just style — several genuine "why does this refire" bugs in this codebase turned out to be exactly this (a `Map`/array rebuilt unconditionally even when nothing changed, cascading into wasted backend calls). `return prev` unchanged is a valid and sometimes necessary updater result.
- **This app's rule engine compares absolute clock-time strings across every race regardless of section or day** (`ruleEngine.ts`'s `RuleProcessor`) — don't assume a "structural vs. display" change classification from an old doc/issue is safe without checking whether the specific change affects computed race times.

## Documentation map

**Current, verified accurate:**
- `README.md` — human-facing overview, quick start
- `documents/ARCHITECTURE.md` — full technical reference: two-DB split, entity/DTO conventions, IPC surface, build/package pipeline
- `documents/RULE_ENGINE.md` — rule fields, operators, matching semantics, current file map
- `documents/PDF_AND_COMPETITOR_TRACKING.md` — PDF extraction → race matching → competitor conflict analysis
- `documents/ELECTRON_CLICK_TESTING_SETUP.md` — how the click-through testing skill works and why
- `documents/INTERVAL_SYSTEM.md` — the races-with-intervals-between-them mental model (still accurate, conceptual)
- `documents/idorend-design-system.md` — UI layout conventions (3-layer: menu → optional submenu → work layer)
- `idorendmaker-db-populator/CATALOG_UPDATE_GUIDE.md` — how to regenerate `catalog.db` when official race data changes

**Historical** (`documents/archive/`) — describe *why* things were built the way they were, but contain superseded schemas, file paths, and code snippets. Read for narrative/rationale only, never for current facts:
- `PROJECT_PLAN.md`, `FUTAMSZINT_IMPLEMENTATION.md`, `RULE_ENGINE_ARCHITECTURE.md`, `SCHEDULE_BUILDER_ARCHITECTURE.md`, `SECTION_MANAGEMENT_ARCHITECTURE.md`, `PDF_COMPETITOR_AWARE_ARCHITECTURE.md`, `CONTINUATION_PROMPT.md`, plus everything already archived before this pass.

## Working conventions observed in this repo

- Commits are small and narrate *why*, not just *what* — follow that pattern, not a one-line "fix bug" message.
- Hungarian UI strings throughout; keep new UI text Hungarian and consistent with existing terminology (see domain glossary).
- Branches: `feature/<name>`, PRs merge into a long-lived integration branch before that eventually merges to `master` — check `git log --oneline master..HEAD` and open PRs before assuming `master` has the latest work.
- When a bug fix's root cause reveals something else is *also* wrong nearby, it's normal in this project's history to fix that too in the same pass rather than filing it and moving on — but only after verifying it live, not just by inspection.
