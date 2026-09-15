import { SectionWorkingData } from '../../../../shared/types/race'

/**
 * Builds a compact string signature of everything about a schedule that
 * actually needs saving: its name plus, per section, the ordered list of
 * races (race + level + interval). Two calls with equivalent content produce
 * an identical string regardless of Map iteration order or object identity.
 *
 * Deliberately excludes anything that is not persisted or not
 * content-affecting (section id ordering is normalized by sorting, and
 * derived/display-only data never enters `SectionWorkingData` in the first
 * place). This mirrors the "structural vs. display" split proposed in #25–#28
 * for the wider performance epic; this signature only aims to answer "is
 * there anything to save", not to gate expensive recalculations.
 */
export function buildScheduleSignature(
  name: string,
  sectionDataMap: Map<number, SectionWorkingData>
): string {
  const sections = Array.from(sectionDataMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([sectionId, data]) => {
      const races = data.races
        .map((race, index) => {
          const interval = data.intervals[index] ?? data.settings.defaultInterval
          return `${race.race.code}:${race.level.code}:${interval}`
        })
        .join('|')
      return `${sectionId}@${data.settings.startTime}#${data.settings.defaultInterval}[${races}]`
    })
    .join(';')

  return `${name}::${sections}`
}
