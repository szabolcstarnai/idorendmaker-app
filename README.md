# Időrend Készítő

A desktop app for building race-day schedules for Hungarian kayak/canoe
competitions. Point it at the official race catalog, drag races into a
timetable across one or more days, and it flags scheduling conflicts (the
same competitor entered in two races too close together, or races that need
a minimum gap by rule) in real time. Optionally, feed it the official PDF
entry list for a competition and it filters the ~2,400-race catalog down to
just the races that actually have entries, with per-competitor conflict
analysis.

Ships as a single Windows installer. Under the hood it's an Electron app
that supervises two local Spring Boot services — there's no external server
and no user-facing configuration.

## Quick start (development)

Prerequisites: Node.js, a JDK 23 (Temurin recommended), Maven wrapper
(bundled as `./mvnw`).

```bash
# Build the two backend JARs (needed once, and after any Java change)
cd idorendmaker-backend && ./mvnw clean package -DskipTests && cd ..
cd idorendmaker-pdfprocessor && ./mvnw clean package -DskipTests && cd ..

# Run the desktop app in dev mode
cd idorendmaker-desktop
npm install
npm start
```

`npm start` launches Electron, which in turn spawns both backend JARs as
child processes and serves the React UI via a Vite dev server. On first
run it seeds a read-only catalog database from the bundled race data and
creates an empty user database (your schedules, rules, and PDF imports) —
both under `idorendmaker-desktop/` in dev mode.

### Full build (installer)

```bash
node scripts/build-backend.js
node scripts/build-pdfprocessor.js
cd idorendmaker-desktop && npm run make
```

Produces an NSIS installer under `idorendmaker-desktop/out/make/`. The
installer downloads a Java 23 runtime on first run if the user doesn't
already have one; no other external dependency.

## Repository layout

| Directory | What |
|---|---|
| `idorendmaker-desktop/` | The Electron + React app |
| `idorendmaker-backend/` | Spring Boot JAR: schedules, rules, race catalog, PDF-to-race matching |
| `idorendmaker-pdfprocessor/` | Spring Boot JAR: parses the official entry-list PDF format |
| `idorendmaker-db-populator/` | Regenerates the race catalog database from source Excel data |
| `documents/` | Architecture references and domain documentation |

## Documentation

Start with **[`CLAUDE.md`](CLAUDE.md)** — the technical orientation doc (tech
stack, repo structure, current known gaps, and traps worth avoiding). It's
written for an AI coding agent picking up the project cold, but is equally
useful for a human doing the same.

Deeper references live in `documents/`:
- [`ARCHITECTURE.md`](documents/ARCHITECTURE.md) — full technical reference
- [`RULE_ENGINE.md`](documents/RULE_ENGINE.md) — the conflict-detection rule system
- [`PDF_AND_COMPETITOR_TRACKING.md`](documents/PDF_AND_COMPETITOR_TRACKING.md) — PDF import and competitor-aware scheduling
- [`ELECTRON_CLICK_TESTING_SETUP.md`](documents/ELECTRON_CLICK_TESTING_SETUP.md) — how to drive the real running app for testing
- [`idorend-design-system.md`](documents/idorend-design-system.md) — UI layout conventions
- `documents/archive/` — historical design docs, kept for context but no longer accurate as current-state references

## License

Apache-2.0 — see [`LICENSE`](LICENSE). Third-party license attributions in
[`THIRD-PARTY-LICENSES.md`](THIRD-PARTY-LICENSES.md).
