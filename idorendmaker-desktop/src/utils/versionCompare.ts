/**
 * Comparison of dotted release versions such as `"2026.3.1"` or a GitHub tag
 * like `"v2026.3.1"`.
 *
 * Mirrors the backend's `CatalogVersions` (idorendmaker-backend
 * `hu.szabolcst.idorendmaker.utils.CatalogVersions`) for the same reason: a
 * plain string comparison orders `"2026.10.0"` *before* `"2026.3.1"` the
 * moment a segment reaches two digits, which would make an update check
 * quietly decide a newer release is older. There is no shared module between
 * the Java backend and this Electron app, so the logic is duplicated
 * on purpose rather than reached for across the language boundary.
 */

/**
 * Strips a leading "v"/"V" from a release tag, e.g. `"v2026.3.1"` -> `"2026.3.1"`.
 */
export function stripVersionPrefix(version: string): string {
  return version.replace(/^[vV]/, '')
}

/**
 * Compares two dotted numeric versions.
 *
 * Segments are compared as numbers; a missing trailing segment counts as 0,
 * so `"2026.3"` and `"2026.3.0"` are equal. A non-numeric segment (a
 * `-rc1` suffix, say) falls back to a case-insensitive string comparison of
 * that segment. `null`/blank versions sort below every real version.
 *
 * @returns negative if `left` is older than `right`, zero if equivalent,
 *          positive if newer
 */
export function compareVersions(
  left: string | null | undefined,
  right: string | null | undefined
): number {
  const leftBlank = !left || left.trim().length === 0
  const rightBlank = !right || right.trim().length === 0
  if (leftBlank || rightBlank) {
    return Number(!leftBlank) - Number(!rightBlank)
  }

  const leftParts = stripVersionPrefix(left.trim()).split('.')
  const rightParts = stripVersionPrefix(right.trim()).split('.')
  const length = Math.max(leftParts.length, rightParts.length)

  for (let i = 0; i < length; i++) {
    const leftPart = leftParts[i] ?? '0'
    const rightPart = rightParts[i] ?? '0'

    const leftNum = /^\d+$/.test(leftPart) ? Number(leftPart) : null
    const rightNum = /^\d+$/.test(rightPart) ? Number(rightPart) : null

    const result =
      leftNum !== null && rightNum !== null
        ? leftNum - rightNum
        : leftPart.localeCompare(rightPart, undefined, { sensitivity: 'base' })

    if (result !== 0) return result
  }

  return 0
}

/** Returns true when `candidate` is strictly newer than `current`. */
export function isNewerVersion(
  candidate: string | null | undefined,
  current: string | null | undefined
): boolean {
  return compareVersions(candidate, current) > 0
}
