# Architecture Reference

**Status**: current as of 2026-09-15 (verified against the codebase while writing, not carried over from an older doc)

This is the single source of truth for how the system is put together today.
For *why* it evolved this way, see `documents/archive/` — but never take a
technical fact (a schema, a file path, a class name) from an archived doc
without checking it against the actual source first; several previously
"current" docs in this repo turned out to describe a schema and package
layout that no longer exists.

---

## System overview

Three independently-buildable pieces, packaged into one Windows installer:

```
┌─────────────────────────────────────────────────────────────┐
│ Electron (idorendmaker-desktop)                              │
│  ┌──────────────┐        ┌────────────────────────────────┐ │
│  │ Main process │──spawn─▶│ idorendmaker-backend.jar        │ │
│  │ (main.ts)    │        │ (Spring Boot, localhost:<port>) │ │
│  │              │──spawn─▶│ idorendmaker-pdfprocessor.jar   │ │
│  └──────┬───────┘        └────────────────────────────────┘ │
│         │ contextBridge                                      │
│  ┌──────▼───────┐                                            │
│  │ React render │──HTTP (axios)──▶ both JARs, localhost only │
│  │ (renderer)   │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

- The renderer talks to both backend services over plain HTTP (via
  `idorendmaker-desktop/src/data/services/BackendAPIService.ts` and
  `PDFProcessorService.ts`), **not** through Electron IPC for the data path.
  IPC (`ipcMain.handle` in `main.ts` ↔ `contextBridge` in `preload.ts`) exists
  only as a thin pass-through so the renderer (sandboxed, no Node access)
  can trigger the main process to make those HTTP calls, plus a handful of
  genuinely main-process-only things (native file dialog, external URL open).
- Both JARs are spawned as child processes on app launch
  (`BackendService.ts`, `PDFProcessorService.ts`), each bound to a
  dynamically-allocated `localhost` port, supervised for the app's lifetime,
  and killed on quit.
- The PDF processor is stateless — it parses a PDF and returns structured
  data; it has no database of its own. The main backend does everything
  else: schedules, rules, the race catalog, and PDF-derived competitor data.

---

## The two databases

This is the most important architectural fact about the backend. There are
**two separate SQLite files**, each with its own Spring datasource, entity
package, and transaction manager — there is no cross-file foreign key or
JPA relationship; SQLite files can't join each other.

| | `catalog.db` | `user.db` |
|---|---|---|
| Contents | Races, boat classes, boat types, age groups, competitive levels | Schedules, sections, schedule items, rules, PDF extractions, competitors |
| Read/write | Read-only at runtime (swapped as a whole file on update) | Read/write |
| Schema owner | Seeded file, no Liquibase | Liquibase (`db/changelog/`) |
| Primary keys | `String code` (stable slugs, e.g. `k1-ferfi-500m`) | `Integer id` (autoincrement) |
| Config | `config/CatalogDataSourceConfig.java` | `config/UserDataSourceConfig.java` |
| Transaction manager bean | `catalogTransactionManager` | `userTransactionManager` (the `@Primary` one) |
| Entity package | `model/entity/catalog/` | `model/entity/` (not nested under a `user/` package) |
| Repository package | `repository/catalog/`, extends `Repository<T, String>` (no save/delete — genuinely read-only) | `repository/`, extends `JpaRepository<T, Integer>` |

Both datasources are built by the shared `config/SqliteDataSourceFactory.java`
(HikariCP, SQLite-specific pragmas). Path resolution for both files —
dev vs. production, override via env — is `service/DatabasePathResolver.java`.

### Catalog bootstrap and update

`service/CatalogBootstrapService.java` runs on startup (`@PostConstruct`,
before the catalog datasource opens its first connection via
`@DependsOn`): if `catalog.db` doesn't exist yet, it's copied from the
classpath resource `db/seed-catalog.db` (built into the JAR itself). It
then checks `catalog_meta.schema_version` against
`app.catalog.expected-schema-version` and refuses to start on a mismatch,
rather than letting Hibernate fail with a confusing mapping error later.

`service/CatalogUpdateService.java` implements checking a remote manifest
URL, downloading a new `catalog.db`, verifying its SHA-256, and atomically
swapping the file — but **this is backend-only and unreachable from the UI
right now** (issue #55): `app.catalog.manifest-url` is unset, nothing is
published to point it at, and no frontend code calls
`POST /api/catalog/check-update`. It also has a real bug: it closes the
catalog `EntityManagerFactory` before the swap and never rebuilds it,
leaving the running app with a dead catalog until restart (#56).

To regenerate `catalog.db` from updated official race data, see
`idorendmaker-db-populator/CATALOG_UPDATE_GUIDE.md` — that doc is current
and accurate, no changes needed there.

### Catalog schema (7 tables, all `code TEXT` primary keys except the join table)

`catalog_meta` (schema_version / catalog_version / generated_at / source) ·
`boat_types` · `boat_classes` (→ `boat_type_code`) · `age_groups` ·
`levels` (level_type: `előfutam` / `középfutam` / `döntő`; `is_default`
marks "Döntő I.") · `races` (→ `boat_class_code`) · `race_age_groups`
(join table, composite PK `(race_code, age_group_code)`).

### User schema (Liquibase, `db/changelog/`)

`db.changelog-master.yaml` includes changesets under `db/changelog/changes/`
in order:
- `0001-initial-user-schema.yaml` — `schedules`, `schedule_sections`,
  `pdf_extractions`, `schedule_items`, `rules`, `rule_conditions`,
  `rule_matchings`, `dismissed_rule_violations`, `competitor_entries`,
  `race_competitor_associations`
- `0002-schedule-item-boat-snapshot.yaml` — adds
  `race_boat_class_code` / `race_boat_type_code` / `race_seat_count` /
  `race_seat_count_text` to `schedule_items`

**`schedule_items` denormalizes catalog data onto itself** (race name,
discipline, gender, distance, boat-class name+code, boat-type code,
seat-count+text, age-groups display string, level name+type) via
`service/ScheduleItemSnapshotPopulator.java`, called whenever a schedule
item's race/level is set. This is deliberate, not accidental duplication:
a saved schedule keeps showing exactly what it was built with even after a
catalog update, and every consumer that needs this data for an *already
loaded* schedule (the rule engine's `boatType`/`seatCount` conditions, the
Excel export's boat-unit count) reads it from these snapshot columns, not
by re-joining the catalog. `RaceCatalogLookupService.loadRaceDisplayData()`
is the one place that resolves a race's display data (name, boat class,
age groups) from the catalog, used both by the populator and by
`RaceMatchingServiceImpl` when building PDF-matched race DTOs — keep both
call sites in sync if you change what's resolved.

Adding a new catalog-derived field to the snapshot means touching three
places: a Liquibase changeset, `ScheduleItemSnapshotPopulator`, and the
frontend's `raceFromSnapshot()` (`idorendmaker-desktop/src/utils/scheduleItemSnapshot.ts`,
which rebuilds a `Race` object from a loaded schedule item for the rule
engine and export to consume).

---

## Backend package structure

```
idorendmaker-backend/src/main/java/hu/szabolcst/idorendmaker/
├── config/          CatalogDataSourceConfig, UserDataSourceConfig, SqliteDataSourceFactory, WebConfig
├── controller/       REST controllers, one per resource (see API surface below)
├── mapper/          MapStruct interfaces, entity ↔ DTO
├── model/
│   ├── dto/          request/response DTOs, subpackaged by resource (race/, rule/, schedule/, ...)
│   ├── entity/        USER entities (Schedule, ScheduleItem, Rule, RuleCondition, ...)
│   └── entity/catalog/ CATALOG entities (Race, BoatClass, BoatType, AgeGroup, Level, RaceAgeGroup, CatalogMeta)
├── repository/        USER repos (JpaRepository<T, Integer>)
│   └── catalog/       CATALOG repos (Repository<T, String>, read-only)
├── service/           interfaces + cross-cutting helpers (RaceCatalogLookupService, ScheduleItemSnapshotPopulator, DatabasePathResolver, CatalogBootstrapService, CatalogUpdateService)
│   └── impl/           implementations
└── utils/             ScheduleTimeCalculator, StringUtil, CatalogVersions
```

### REST API surface (all under `/api`)

| Base path | Controller | Datasource |
|---|---|---|
| `/races` | `RaceController` | catalog |
| `/boat-classes` | `BoatClassController` | catalog |
| `/levels` | `LevelController` | catalog |
| `/catalog` | `CatalogUpdateController` — `GET /version`, `POST /check-update` | catalog (meta only) |
| `/schedules` | `ScheduleController` | user (+ catalog reads via snapshot populator) |
| `/rules` | `RuleController` | user |
| `/competitors` | `CompetitorController` | user |
| `/pdf` | `RaceMatchingController` | user + catalog (matching) |

### Cross-datasource read pattern

A user-side service needing catalog data injects `RaceCatalogLookupService`
or `LevelRepository` directly and calls it inside a method (or the whole
service) annotated
`@Transactional(readOnly = true, transactionManager = "catalogTransactionManager")`.
Never attempt a JPA relationship across the two entity packages — there
isn't one, and can't be (separate SQLite connections).

---

## PDF processor (`idorendmaker-pdfprocessor`)

Minimal, stateless Spring Boot service. `controller/VersenyszamController.java`
exposes `POST /versenyszam/extract` (multipart PDF upload), delegates to
`extractor/VersenyszamNevezesekExtractor.java` (positional-text PDFBox
parsing tuned to the official MKKSZ entry-list PDF layout), returns
`List<Versenyszam>` (race name + list of `Versenyzo` competitors). No
persistence — the main backend's `RaceMatchingServiceImpl` (via
`RaceMatchingController` → `/api/pdf/*`) takes that list, matches races
against the catalog by name, and persists `PDFExtraction` /
`CompetitorEntry` / `RaceCompetitorAssociation` rows in `user.db`. See
`documents/PDF_AND_COMPETITOR_TRACKING.md` for the full flow.

**Dev-mode JAR resolution**: both `BackendService.ts` and
`PDFProcessorService.ts` resolve their jar via
`idorendmaker-desktop/src/features/common/services/devJarResolver.ts`,
which scans the module's `target/` directory for whatever versioned jar
Maven actually produced (`idorendmaker-backend-2.0.0.jar`,
`idorendmaker-pdfprocessor-1.0.1.jar`, ...) rather than assuming a fixed
filename. Don't reintroduce a hardcoded jar name or version — that's
exactly what broke PDF processing in dev mode before (#62).

---

## Frontend structure (`idorendmaker-desktop/src/`)

```
components/
  app/         App.tsx (view router + top-level state), MainMenu.tsx, Navbar.tsx
  schedule/    ScheduleBuilder.tsx (the main workspace), ScheduleRaceList, CombinedSettingsPanel, ...
  rules/       RuleManager, RuleEditor, ConditionBuilder, RuleViolationDisplay
  pdf/         PDFManager, PDFUploadPanel, PDFExtractionList, PDFExtractionDetails, CompetitorTracker
  race/        RaceList, LevelSelectorModal
  ui/          shadcn/ui primitives (button, card, dialog, ...) - don't hand-roll these
features/
  schedule/hooks/    useScheduleSectionData.ts (owns the in-memory schedule-being-built state - the
                     single most load-bearing file in the frontend), useSaveSchedule.ts
  schedule/utils/    scheduleTimeCalculator.ts, scheduleSignature.ts (unsaved-changes detection)
  rules/utils/       ruleEngine.ts (ConditionEvaluator, MatchingEvaluator, RuleProcessor,
                     CompetitorAwareRuleProcessor, ConflictDetector) - client-side rule evaluation,
                     mirrors backend semantics so the UI can highlight violations without a round-trip
  common/services/   BackendService.ts, PDFProcessorService.ts, devJarResolver.ts, AppUpdateService.ts
  common/hooks/      useUnsavedChanges.ts (the global "unsaved changes, confirm before navigating" gate)
  pdf/services/      (renderer-side PDF workflow helpers)
data/services/       BackendAPIService.ts (every HTTP call to the main backend), ExportService (Excel)
utils/               scheduleItemSnapshot.ts (raceFromSnapshot, ageGroupsFromDisplay), versionCompare.ts
shared/types/race.ts  TypeScript types mirroring backend DTOs - Race/Level/BoatClass all string-code keyed
main.ts / preload.ts  Electron main process + the window.electronAPI IPC surface
```

### Schedule Builder data model

`useScheduleSectionData` owns `sectionDataMap: Map<sectionId, SectionWorkingData>`
— the in-memory representation of a schedule being edited, independent of
the database until save. Each `SectionWorkingData` holds its own
`races: ScheduleRace[]`, `intervals: number[]` (break time *after* each
race, not before), and per-section `settings` (start time, default
interval for new races). Switching between day/section tabs just reads a
different map entry — no data loss, no round-trip.

**Performance-sensitive part**: `allScheduleRaces` (the flattened
all-sections array) feeds both the debounced rule-violation check
(`ScheduleBuilder.tsx`) and `CompetitorTracker`'s conflict analysis, both
of which call the backend. The hook caches this array by comparing each
section's *races-array reference* against the previous render, so a
change that doesn't touch any section's `races` (changing the default
interval setting, revisiting an already-synced section) returns the same
array reference instead of rebuilding — which is what actually stops those
expensive backend calls from firing on every unrelated interaction. See
the hook's own comments for the specific historical bugs this fixes
(commit `f895f01`, issues #25-28) before changing this logic — it's easy
to accidentally reintroduce the exact problem it solves by adding an
"obviously safe" `useMemo`/`useEffect` that rebuilds on every render.

**Do not** treat "section start time changed" as safe to skip for rule
re-validation — `ruleEngine.ts`'s `RuleProcessor` compares every race
pair's *absolute* clock-time string across the whole schedule (all
sections, all days, no date component), so a start-time change genuinely
changes what's being evaluated.

### Unsaved-changes / save state

`buildScheduleSignature(name, sectionDataMap)`
(`features/schedule/utils/scheduleSignature.ts`) produces a content-only
signature (name + per-section race/level/interval content, order-sensitive
within a section, order-independent across sections). `ScheduleBuilder`
keeps a `savedSignature` baseline — set when a *different* schedule loads
(keyed on `schedule?.id` only, not `schedule` itself, so adding a section
doesn't reset an in-progress rename) and updated only after a save
genuinely resolves. `hasUnsavedChanges` is just `currentSignature !==
savedSignature`. `useSaveSchedule.saveSchedule()` properly `await`s the
parent's save callback before reporting success — don't remove that
await, it's what makes save failures actually surface instead of a
"saved successfully" toast for a save that silently failed.

### IPC surface (`window.electronAPI`)

Defined in `preload.ts` (`ElectronAPI` interface + `contextBridge.exposeInMainWorld`
implementation), handlers in `main.ts` (`ipcMain.handle('namespace:action', ...)`).
Naming convention: `db:*` for backend CRUD passthroughs, `pdf:*` for PDF
processor operations, `competitor:*` for competitor analysis, `export:*`
for Excel, `app:*` for app-level (version, update check). **This object is
frozen by contextBridge** — you cannot reassign its methods from the
renderer to intercept calls; see the testing skill for the actual working
technique when you need to observe what fired.

Two IPC calls exist specifically to route around what the renderer can't
do directly: `pdf:selectFile` (opens the native OS file dialog — genuinely
unreachable from CDP/Playwright) and `app:openExternalUrl` (opens a URL in
the OS default browser, restricted to `https://` in the handler).
`pdf:processAndMatch(filePath: string)` is a **separate** call that takes
a raw path — decoupled from the dialog, which is how automated testing can
exercise PDF processing without the dialog (see the testing skill).

---

## Build & packaging

```
scripts/build-backend.js        mvnw clean package -DskipTests, copies to idorendmaker-desktop/resources/
scripts/build-pdfprocessor.js   same, for the PDF processor
scripts/license-manager.js      collects third-party license data (license-checker + mvn license plugin)
scripts/desktop-packager.js     invoked by npm build:quick/build:full - electron-forge package/make
```

Root `package.json` scripts: `build:quick` (license + package, skips
rebuilding the JARs), `build:full` (everything from scratch).
`idorendmaker-desktop/forge.config.ts`: `packagerConfig.extraResource`
bundles both JARs into the packaged app;`preMake` hook
(`validateResources()`) asserts they're present and non-empty before
building the installer. The NSIS installer
(`idorendmaker-desktop/build/installer/installer.nsh`) downloads and
installs a Temurin 23 JRE on first run if the user doesn't already have
Java 23+ on PATH — no database is bundled or copied by the installer
anymore; both databases self-initialize on first launch (catalog seeded
from the backend JAR's classpath resource, user DB created by Liquibase).

---

## App-level update check (separate from the catalog update mechanism)

`features/common/services/AppUpdateService.ts` (main process) checks
`GET /repos/szabolcstarnai/idorendmaker-app/releases/latest` and compares
against `app.getVersion()` via `utils/versionCompare.ts` (dotted-numeric
comparison — don't use a plain string comparison, `"2026.10.0"` sorts
before `"2026.3.1"` as strings). User-triggered from the main menu (a
button) plus a quiet automatic check ~2s after the menu mounts, errors
swallowed silently — this app is frequently run at competition venues
without reliable internet, so a failed background check must never be
visible as an error. Mirrors the backend `CatalogVersions.java` comparator
for the same reason, duplicated rather than shared since there's no
cross-language module boundary between the Java backend and the Electron
app.
