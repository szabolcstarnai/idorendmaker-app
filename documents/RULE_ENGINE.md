# Rule Engine Reference

**Status**: current as of 2026-09-15

A rule expresses: *if a race matches condition set A, and another race
matches condition set B, and the matching-requirement fields agree between
them, then at least N minutes must separate them.*

---

## Where it lives

- **Persistence** (`user.db`, via `user.db` tables `rules` / `rule_conditions`
  / `rule_matchings`): `idorendmaker-backend` — `RuleController` (`/api/rules`),
  `RuleService`/`RuleServiceImpl`, `RuleRepository` (`JpaRepository<Rule, Integer>`,
  fetch-joins conditions and matchings to avoid `MultipleBagFetchException`).
- **Evaluation**: happens **client-side**, in
  `idorendmaker-desktop/src/features/rules/utils/ruleEngine.ts` — the
  frontend re-implements the same semantics so the Schedule Builder can
  highlight violations without a server round-trip on every keystroke. If
  you change matching/condition semantics, both the frontend evaluator and
  anything documented here need updating together; the backend does not
  independently re-derive violations except as part of the
  competitor-aware flow described below.
- **UI**: `components/rules/` — `RuleManager` (list, search, active/inactive
  toggle, delete), `RuleEditor` (create/edit form), `ConditionBuilder`
  (condition set A/B editor with dropdown-driven values), `RuleViolationDisplay`
  (shown inline in `ScheduleBuilder`, click-to-highlight the offending races).

## Condition fields

`ConditionEvaluator.getFieldValue` (`ruleEngine.ts`) resolves these from a
`ScheduleRace` (a race + the specific competitive level it's scheduled at):

| Field | Resolves to |
|---|---|
| `discipline` | `race.discipline` (Kajak / Kenu / SUP / Kajakpóló / Parakenu / Sárkányhajó / Szlalom / Tengeri kajak) |
| `boatClass` | `race.boatClassCode` (a catalog code, not the display name) |
| `gender` | `race.gender` (Férfi / Női / Vegyes) |
| `distance` | `race.distance` |
| `ageGroups` | joined display names of the race's age groups |
| `name` | `race.name` |
| `level` | `level.name` (e.g. "Döntő I.", "I. Előfutam") |
| `levelType` | `level.levelType` (`előfutam` / `középfutam` / `döntő`) |
| `boatType` | `race.boatTypeCode` — resolved from the boat class, either live from the catalog or from a saved schedule item's snapshot (`race_boat_type_code`) |
| `seatCount` | `race.seatCountText` (a **string**, e.g. `"1"`, `"2"`, `"csapat"` — matched against the rule editor's dropdown values, not the numeric `seatCount`) |

`boatType`/`seatCount` were broken (always resolved `null`) for a period
after the `Integer id → String code` migration until the snapshot columns
were added to `schedule_items` — if you see a rule involving those fields
silently not matching, check that the schedule item actually has
`race_boat_type_code`/`race_seat_count_text` populated (changeset `0002`).

## Operators

`equals`, `not_equals`, `in` (semicolon-separated value list),
`not_in` (semicolon-separated). Semicolons, not commas, specifically
because race distances use comma as a decimal separator ("3,6 km") in
Hungarian notation.

## Matching requirements

Fields that must agree between the two races for the rule to apply at all
(`MatchingEvaluator.fieldsMatch`): `discipline`, `boatClass`, `gender`,
`distance`, `name`, `level`, `levelType`, `boatType`, `seatCount` (plain
equality), `ageGroups` (set intersection — any overlapping age group
counts as a match), `baseRaceCode` (same underlying race, different
competitive level — this is what lets a rule say "same race's
preliminary and semifinal need N minutes apart").

## Violation detection (`RuleProcessor.checkRuleAgainstSchedule`)

For every active rule, filters the full schedule into races matching
condition set A and condition set B, then checks **every A×B pair**
(excluding a race against itself) for which the matching requirements
hold. For each such pair, it parses both races' `startTime` ("HH:MM") into
minutes-since-midnight and takes the absolute difference.

**This comparison is across the entire schedule — every section, every
day — with no date component.** Two races on different days at similar
clock times are compared exactly like two races on the same day. This is
a real, pre-existing quirk (not something introduced recently) worth
knowing before assuming a "days are obviously independent" performance
optimization is safe — it isn't, today, for rule violation checking.

Violation hash format (used for dismissal tracking, stored in
`dismissed_rule_violations`): `ruleId|race1Code|race1StartTime|race2Code|race2StartTime`.

## Competitor-aware variant

`CompetitorAwareRuleProcessor.checkScheduleViolationsWithCompetitors`
wraps the same base violation detection, then for each violation calls the
backend (`competitor:checkConflicts` → `/api/competitors/*`) to check
whether any competitor is actually entered in *both* races. A rule
violation with an actual competitor overlap is escalated to `error`
severity; one without becomes an informational `warning`. See
`documents/PDF_AND_COMPETITOR_TRACKING.md` for how competitor data gets
into the schedule in the first place (requires a processed PDF extraction
— this path is inactive for a schedule built without one).

## Performance note

`ScheduleBuilder.tsx` debounces rule-checking 500ms after
`allScheduleRaces` changes. A second effect re-validates immediately
(undebounced) specifically when `pdfExtractionId` transitions to a value —
it reads the current races through a ref rather than depending on
`allScheduleRaces` directly, so it doesn't duplicate the debounced check
on every ordinary race edit (this used to double-fire, see commit
`f895f01`). Both effects — and `CompetitorTracker`'s own analysis effect —
depend on `allScheduleRaces`' reference staying stable across genuinely
inert changes; see `documents/ARCHITECTURE.md`'s "Schedule Builder data
model" section for why that reference stability is the hook's job, not
something to re-derive here with a local `useMemo`.
