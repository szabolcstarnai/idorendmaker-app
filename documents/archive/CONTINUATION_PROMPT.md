# Continuation Prompt — Catalog/User DB Separation Refactor

> **Moved to `documents/archive/` 2026-09-15** (was already marked complete
> below). For current architecture, start at `CLAUDE.md` / `documents/ARCHITECTURE.md`
> instead of this document.

> **Status: complete.** Every phase described below (1–6, 8, 9) is implemented,
> reviewed and committed on `feature/separate-catalog-from-user-data`, followed
> by the frontend `Integer id` → `String code` migration (`bd8d6d7`…`518613c`)
> and the 2026.3.1 release prep. This document is kept as the record of what was
> done and why; it is no longer a prompt to execute.
>
> Known gaps left open after the refactor are tracked as issues, not here:
> #55 (catalog update flow unreachable from the app), #56 (catalog EMF closed on
> swap and never rebuilt), #57 (no CI), #58 (test coverage), #59 (age groups
> snapshotted by name only), #60 (backend JAR defaults to the dev profile).

Use this prompt verbatim at the start of a new Claude Code conversation in the `C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app` working directory.

---

## PROMPT START

This is a continuation of a multi-phase database restructuring of a Spring Boot kayak race scheduling app (`idorendmaker-app`). The approved plan lives at `C:\Users\Szabolcs\.claude\plans\binary-snacking-pine.md`. Read it for background, but this document is the authoritative source for what's done and what's next.

### Project overview

- **Stack:** Spring Boot 3.4.5, Java 23, Maven (`mvnw`), Spring Data JPA, Hibernate + SQLite (xerial 3.45.3.0, Community Dialects), MapStruct + Lombok, Liquibase
- **Branch:** `feature/separate-catalog-from-user-data` (base: `master`)
- **Domain:** Hungarian kayak/canoe race scheduling (Verseny=competition, Versenyszám=race, Futam=heat, Futamszint=level, Hajóosztály=boat class, Korosztály=age group)
- **Core goal:** Separate static race catalog (`catalog.db`, read-only, swappable) from user data (`user.db`, read/write, Liquibase-managed). All catalog references migrated from `Integer id` to stable `String code`. No data migration — all pre-existing user data is discarded (breaking change for 2026).

### Two-datasource architecture (in place since Phase 1)

Two Spring datasources with separate `EntityManagerFactory` + `PlatformTransactionManager`:
- **Catalog:** `catalogDataSource` / `catalogEntityManagerFactory` / `catalogTransactionManager` → entities in `model.entity.catalog.*`, repos in `repository.catalog.*`
- **User (primary):** `userDataSource` / `userEntityManagerFactory` / `userTransactionManager` → entities in `model.entity.*` (NOT in a `user/` subpackage), repos in `repository.*`

Config classes: `config/CatalogDataSourceConfig.java`, `config/UserDataSourceConfig.java`, `config/SqliteDataSourceFactory.java`.

Cross-datasource references use stable string codes (no FK across SQLite files). User-side services that need catalog reads use `@Transactional(readOnly = true, transactionManager = "catalogTransactionManager")` on helper components like `RaceCatalogLookupService` and `ScheduleItemSnapshotPopulator`.

---

### COMPLETED PHASES (all committed and reviewed)

| Phase | Commit(s) | Summary |
|-------|-----------|---------|
| 1 | `b88e543`, `d01e7c8` | Two-datasource skeleton + Liquibase dep, `DatabasePathResolver` split into `resolveUserDbPath()` + `resolveCatalogDbPath()`, `CatalogBootstrapService` stub that creates empty catalog.db |
| 2 | `423ac68`, `70b4f35` | `0001-initial-user-schema.yaml` — full user.db schema from scratch (all tables with string code refs + snapshot cols on schedule_items) |
| 3 | `11f4c23`, `d905685` | Catalog entities (`model.entity.catalog.*`: Race, BoatClass, BoatType, AgeGroup, RaceAgeGroup, Level, CatalogMeta with String PKs) + read-only repos (`repository.catalog.*` extending `Repository<T, String>`) |
| 4a | `69d348d`, `23dd46d` | Read-only catalog services (RaceServiceImpl, BoatClassServiceImpl, LevelServiceImpl) migrated to catalog entities with string codes |
| 4b-1 | `9513ff6`, `a22134b` | ScheduleItem rewrite: `String raceCode`/`levelCode` + 8 snapshot columns. Created `ScheduleItemSnapshotPopulator`. Schedule service/mapper/DTO refactored |
| 4b-2 | `20488ec`, `99143aa` | RaceCompetitorAssociation rewrite: `String raceCode`. Created `RaceCatalogLookupService`. CompetitorService, RaceMatchingService, CompetitorController migrated |
| 4b-3 | `1bf4fc9` | Deleted 6 legacy entity files + 4 legacy repos. Cleaned RaceMapper/LevelMapper of legacy overloads. Removed `@Deprecated Integer id` from DTOs. Renamed ScheduleItemRepository methods. Added Javadoc to ScheduleItemSnapshotPopulator |
| 5 | `ff31ce1`, `6ad2c6d`, `c1b1c7e` | Rewrote `idorendmaker-db-populator/populate-db.ts` to generate new 7-table catalog schema with string code PKs. Produced `seed-catalog.db` (2427 races, 38 age groups, 30 boat classes, 16 boat types, 44 levels). Created `CATALOG_UPDATE_GUIDE.md`. Follow-up: age group dedup, deprecated `generate-migration.ts`, slug stability docs |

---

### REMAINING PHASES — implement in this conversation

#### Phase 6: Catalog bootstrap + update services + controller

**Goal:** Wire up first-run seed copying from the JAR and the remote catalog update flow.

**6a: Rewrite `CatalogBootstrapService`** (`service/CatalogBootstrapService.java`):
- Current state: a Phase 1 stub that creates an EMPTY `catalog.db` via raw JDBC `DriverManager.getConnection(jdbcUrl)`.
- New behavior: if `<userDataDir>/catalog.db` doesn't exist or is empty, copy `classpath:db/seed-catalog.db` via `ClassPathResource.getInputStream()` to disk.
- The existing `@PostConstruct` + `@DependsOn("catalogBootstrapService")` pattern on the catalog datasource bean is already in place — just replace the body.
- On first launch, log: `Copied seed catalog.db from classpath to <path>`.
- On subsequent launches (file exists and is non-empty), do nothing.

**6b: Schema version check on startup:**
- After bootstrap, read `catalog_meta` row where `meta_key='schema_version'` and compare against `app.catalog.expected-schema-version` (new property, default=1).
- If mismatch, throw a clear startup error: `"Catalog schema version X does not match expected version Y. Please update the application or the catalog."` — do NOT let Hibernate silently fail with mapping errors.
- Implementation: either in `CatalogBootstrapService.ensureCatalogDatabaseExists()` after copy, or as a separate `@PostConstruct` method. Use raw JDBC (the catalog EMF isn't ready yet at this point) — open a connection via `DriverManager.getConnection("jdbc:sqlite:" + catalogPath)` and query `SELECT meta_value FROM catalog_meta WHERE meta_key = 'schema_version'`.

**6c: Create `CatalogUpdateService`** (new class `service/CatalogUpdateService.java`):
- Responsibility chain:
  1. **Manifest fetch** — GET `app.catalog.manifest-url` returning JSON: `{ "catalogVersion": "...", "schemaVersion": N, "downloadUrl": "...", "sha256": "..." }`
  2. **Compare** — read current `catalog_meta.catalog_version`. If remote is newer AND `schemaVersion` matches `app.catalog.expected-schema-version`, proceed.
  3. **Download** — stream new file to `<userDataDir>/catalog.db.new` (staging file).
  4. **Verify** — compute SHA-256 of downloaded file, compare to manifest value.
  5. **Swap** — close the catalog `EntityManagerFactory` and connection pool, atomically replace `catalog.db` with `catalog.db.new` via `Files.move(ATOMIC_MOVE, REPLACE_EXISTING)`, re-create the catalog EMF.
  6. **Notify** — publish a Spring `ApplicationEvent` so frontend can refresh cached dropdowns.
- If `app.catalog.manifest-url` is blank/unset, the check-update endpoint returns "not configured" gracefully.

**6d: Create `CatalogEntityManagerRebuilder`** (new helper `service/CatalogEntityManagerRebuilder.java`):
- Tears down the catalog `EntityManagerFactory` + `DataSource` and rebuilds them.
- Called by `CatalogUpdateService` after the atomic file swap.
- Approach: inject `catalogEntityManagerFactory` as `EntityManagerFactory`, close it, then rebuild using the same config from `CatalogDataSourceConfig`. This is tricky with Spring's bean lifecycle — consider using a `ConfigurableApplicationContext.getBeanFactory()` approach or making the catalog EMF a refreshable proxy.
- Simpler alternative: since catalog is read-only and the app is a desktop app (single user), the rebuilder could simply set a flag and require app restart for the new catalog to take effect. The controller response would say "Update downloaded. Restart to apply." This avoids EMF rebuild complexity.

**6e: Create `CatalogUpdateController`** (new REST controller `controller/CatalogUpdateController.java`):
- `GET /api/catalog/version` — returns the `catalog_meta` rows (schema_version, catalog_version, generated_at).
- `POST /api/catalog/check-update` — triggers the update flow; returns JSON with result (updated version, already-up-to-date, not-configured, or error).
- No automatic polling in v1 — user explicitly triggers updates from the desktop UI.

**New properties to add to `application.properties`:**
```properties
# Catalog update (placeholder until first GitHub release is published)
app.catalog.manifest-url=
app.catalog.expected-schema-version=1
```

**Verification:**
1. `./mvnw -f idorendmaker-backend clean compile` → BUILD SUCCESS
2. Fresh start: delete `catalog.db` and `user.db` from dev data dir (`idorendmaker-desktop/`), boot → seed copied, catalog endpoints return data
3. Schema mismatch: edit `catalog_meta.schema_version` to 999 in `catalog.db`, restart → clear error message, app refuses to start
4. Boot smoke test → "Started IdorendMakerApplication"
5. Single commit: `Phase 6: catalog bootstrap from seed + update service + version controller`

---

#### Phase 8: Remove custom MigrationRunner

**Goal:** Delete the legacy custom SQL migration system now that Liquibase handles user.db schema.

**Files to delete:**
- `src/main/java/hu/szabolcst/idorendmaker/migration/MigrationRunner.java` (~250 lines, `@Component @Order(1) implements CommandLineRunner`)
- `src/main/java/hu/szabolcst/idorendmaker/migration/Migration.java` (record class)
- `src/main/resources/db/migrations/` — entire directory (README.md + 2 SQL files)

**Properties to remove from `application.properties`:**
```properties
# Custom migration runner (unchanged)
# Disabled globally: Phase 1 onward uses Liquibase on user.db; Phase 8 removes MigrationRunner entirely.
app.migration.enabled=false
app.migration.locations=classpath:db/migrations
```

**Verification:**
1. `./mvnw -f idorendmaker-backend clean compile` → BUILD SUCCESS
2. Grep: no `app.migration` references remain in `src/main/resources/`
3. Grep: no `migration` package imports remain in `src/main/java/`
4. Boot smoke test → "Started IdorendMakerApplication"
5. Single commit: `Phase 8: remove legacy MigrationRunner`

---

#### Phase 9: Clean up config & properties

**Goal:** Final property and configuration cleanup to reflect the new two-database world.

**`application.properties` changes:**
- Remove any stale `# Custom migration runner` comment block left after Phase 8
- Ensure Liquibase config is present: `spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.yaml` and `spring.liquibase.enabled=true` (may already be wired via `UserDataSourceConfig`)
- Verify `app.catalog.manifest-url=` and `app.catalog.expected-schema-version=1` are present (added in Phase 6)

**Other cleanup:**
- Verify `spring.jpa.hibernate.ddl-auto=none` is still set
- Ensure no stale `@EnableJpaRepositories` annotation exists on old `JpaConfig.java` (should already be deleted)
- Final grep for any `TODO(Phase ...)` comments across the entire codebase — all should be resolved
- Remove the `nameGenerator = FullyQualifiedAnnotationBeanNameGenerator.class` from `CatalogDataSourceConfig` and its comment about "legacy simple-name-derived beans" — all legacy repos are now deleted
- Update `CatalogDataSourceConfig` class Javadoc to remove references to "legacy" repos or "migration phase"

**Verification:**
1. Full build: `./mvnw -f idorendmaker-backend clean package` → BUILD SUCCESS
2. Boot smoke test with fresh databases → both created and initialized correctly
3. All catalog endpoints return data: `GET /api/races`, `GET /api/boat-classes`, `GET /api/levels`
4. Single commit: `Phase 9: final config and property cleanup`

---

### Key helper components (reference for implementers)

- **`RaceCatalogLookupService`** (`service/RaceCatalogLookupService.java`): Wraps all catalog reads for user-side callers with `@Transactional(readOnly=true, transactionManager="catalogTransactionManager")`. Methods: `findAllRaces()`, `findRaceByCode(String)`, `findRacesByCodes(Collection<String>)` (bulk IN-query), `loadRaceDisplayData(String)` (resolves boat class name + age groups display string into a `RaceDisplayData` record).
- **`ScheduleItemSnapshotPopulator`** (`service/ScheduleItemSnapshotPopulator.java`): Populates the 8 denormalized snapshot fields on a `ScheduleItem` from catalog data. Every call unconditionally overwrites all snapshot fields.
- **`DatabasePathResolver`** (`service/DatabasePathResolver.java`): Resolves paths for both `user.db` and `catalog.db`. Properties: `app.database.mode`, `app.database.development.relative-dir`, `app.database.production.app-name`, `app.database.user.filename`, `app.database.catalog.filename`, `app.database.override-path`.
- **`CatalogBootstrapService`** (`service/CatalogBootstrapService.java`): Currently Phase 1 stub (creates empty catalog.db). Has `BEAN_NAME` constant used by `@DependsOn` in `CatalogDataSourceConfig`. Phase 6 rewrites this.
- **`CatalogDataSourceConfig`** (`config/CatalogDataSourceConfig.java`): Defines `catalogDataSource` (with `@DependsOn(BEAN_NAME)`), `catalogEntityManagerFactory`, `catalogTransactionManager`. EMF scans `model.entity.catalog` package.
- **`SqliteDataSourceFactory`** (`config/SqliteDataSourceFactory.java`): Shared factory for creating HikariCP connection pools with SQLite-specific pragmas. Used by both datasource configs.

### Catalog entity schema reference

| Entity | Table | PK | Key columns |
|--------|-------|----|-------------|
| `CatalogMeta` | `catalog_meta` | `meta_key TEXT` | `meta_value TEXT` |
| `BoatType` | `boat_types` | `code TEXT` | `name TEXT NOT NULL`, `sort_order INTEGER` |
| `BoatClass` | `boat_classes` | `code TEXT` | `name TEXT NOT NULL`, `boat_type_code TEXT`, `seat_count INTEGER`, `seat_count_text TEXT` |
| `AgeGroup` | `age_groups` | `code TEXT` | `name TEXT NOT NULL`, `sort_order INTEGER` |
| `Level` | `levels` | `code TEXT` | `name TEXT NOT NULL`, `level_type TEXT`, `sort_order INTEGER`, `is_default INTEGER` |
| `Race` | `races` | `code TEXT` | `name TEXT NOT NULL`, `discipline TEXT NOT NULL`, `boat_class_code TEXT NOT NULL`, `gender TEXT NOT NULL`, `distance TEXT NOT NULL`, `hidden INTEGER NOT NULL`, `sort_order INTEGER` |
| `RaceAgeGroup` | `race_age_groups` | `(race_code, age_group_code)` | composite PK only |

### Seed catalog.db contents (produced by Phase 5)

Located at `idorendmaker-backend/src/main/resources/db/seed-catalog.db` (954 KB).
- 4 catalog_meta rows: schema_version=1, catalog_version=2026.0, generated_at=..., source=seed
- 16 boat types, 30 boat classes, 38 age groups, 44 levels (16 előfutam + 10 középfutam + 18 döntő)
- 2427 races, 5042 race-age group links
- Generated by `idorendmaker-db-populator/populate-db.ts` (`npm run populate:seed`)

### Important operational notes

- User entities in `model/entity/` are NOT in a `user/` subpackage — they stay at the root level. Only catalog entities are in `model/entity/catalog/`.
- Catalog repos use `extends Repository<T, String>` (read-only, no save/delete) while user repos use `extends JpaRepository<T, Integer>`.
- `ScheduleItem` and `RaceCompetitorAssociation` are user entities that store `String raceCode` / `String levelCode` for cross-datasource references.
- Boot smoke tests: `mvnw spring-boot:run` exits with code 1 after `taskkill` — that's expected, not a failure. The success signal is the log line "Started IdorendMakerApplication in X.Xs".
- Port 8080 may have stale `java.exe` processes from previous boot tests — kill them with `netstat -ano | grep ":8080"` + `taskkill //F //PID <pid>` before starting a new boot test.
- The `MigrationRunner` is currently disabled (`app.migration.enabled=false`) but the code + migration SQL files still exist — they're deleted in Phase 8.
- Liquibase runs against `userDataSource` only. `catalog.db` has `ddl-auto=none` and no Liquibase — its schema comes from the seed file.

### Execution methodology

This project uses **subagent-driven development with two-stage review** (skill: `superpowers:subagent-driven-development`):

1. **Implementer subagent** (general-purpose Agent) receives the detailed phase spec from this document and executes end-to-end: reads existing code, edits, deletes, compiles (`./mvnw -f idorendmaker-backend clean compile`), boot smoke test (`./mvnw -f idorendmaker-backend spring-boot:run` → wait for "Started" → kill), commits.
2. **Spec compliance reviewer** (subagent_type `superpowers:code-reviewer`) verifies the implementer's work against the phase specification. Flags missed items, stale references, spec deviations.
3. **Code quality reviewer** (subagent_type `feature-dev:code-reviewer`) reviews for bugs, duplication, null-safety, dead code, naming, Javadoc quality.
4. **Follow-up commit** addresses any review findings (dispatch implementer subagent to fix).

Dispatch both reviewers in parallel after the implementer finishes. Each phase produces 1–2 commits (main + optional follow-up).

### Out of scope (NOT part of this branch)

- Publishing the first GitHub Release of `catalog.db` + manifest JSON
- Frontend changes to consume `code: String` instead of `id: Integer` (tracked separately)
- Automated periodic polling for catalog updates (v1 is user-triggered only)
- Alias/redirects table for renamed catalog codes
- Rewriting `generate-migration.ts` for the new schema (deprecated, documented in CATALOG_UPDATE_GUIDE.md)

### Your task

**Implement Phase 6, then Phase 8, then Phase 9** using subagent-driven development as described above. After all three phases are committed and reviewed, use `superpowers:finishing-a-development-branch` to wrap up.

## PROMPT END
