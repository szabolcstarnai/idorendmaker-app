import type {
  AgeGroup,
  RaceWithAgeGroupsAndBoatClass,
} from '../../shared/types/race'

/**
 * The denormalized catalog snapshot carried on every persisted schedule item.
 * Declared structurally so both `ScheduleItem` and `ScheduleItemWithRaceAndSection`
 * (and the loosely typed section payloads in App.tsx) satisfy it.
 */
export interface RaceSnapshotFields {
  raceCode: string
  raceName: string
  raceDiscipline: string
  raceGender: string
  raceDistance: string
  raceBoatClassName: string
  raceBoatClassCode?: string | null
  raceBoatTypeCode?: string | null
  raceSeatCount?: number | null
  raceSeatCountText?: string | null
  raceAgeGroupsDisplay?: string | null
}

/**
 * Rebuild age groups from the snapshot's comma-separated display string.
 *
 * Only names survive the snapshot, so the codes are synthesized from the name.
 * That is enough for every consumer we have — rule conditions and matchings
 * compare age groups by name — but it means these objects must not be written
 * back to the catalog.
 */
export function ageGroupsFromDisplay(
  display: string | null | undefined
): AgeGroup[] {
  if (!display) return []
  return display
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0)
    .map((name, index) => ({ code: name, name, sortOrder: index }))
}

/**
 * Rebuild a race object from a saved schedule item's catalog snapshot.
 *
 * Saved schedules intentionally read from the snapshot rather than the live
 * catalog so a schedule keeps showing what it was built with, even after the
 * catalog is updated. Everything the rule engine and the Excel export need —
 * boat class code, boat type, seat count, age groups — has to come from here.
 */
export function raceFromSnapshot(
  item: RaceSnapshotFields
): RaceWithAgeGroupsAndBoatClass {
  return {
    code: item.raceCode,
    name: item.raceName,
    discipline: item.raceDiscipline,
    gender: item.raceGender,
    distance: item.raceDistance,
    // Pre-0002 rows have no snapshotted code; the name is the best we have.
    boatClassCode: item.raceBoatClassCode ?? item.raceBoatClassName,
    boatClassName: item.raceBoatClassName,
    boatTypeCode: item.raceBoatTypeCode ?? undefined,
    seatCount: item.raceSeatCount ?? null,
    seatCountText: item.raceSeatCountText ?? undefined,
    sortOrder: 0,
    hidden: false,
    ageGroups: ageGroupsFromDisplay(item.raceAgeGroupsDisplay),
  }
}
