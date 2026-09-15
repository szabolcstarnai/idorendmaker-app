package hu.szabolcst.idorendmaker.utils;

/**
 * Comparison of catalog version strings such as {@code "2026.3.1"}.
 *
 * <p>Catalog versions are dotted release numbers, so they must be compared
 * segment by segment as numbers. A plain {@code String.compareTo} gets this
 * wrong the moment a segment reaches two digits — it orders {@code "2026.10.0"}
 * <em>before</em> {@code "2026.3.1"}, which would make the update check quietly
 * decide a newer catalog is older and skip it.
 */
public final class CatalogVersions {

    private CatalogVersions() {
    }

    /**
     * Compares two catalog versions.
     *
     * <p>Numeric segments are compared as numbers; a missing segment counts as
     * {@code 0}, so {@code "2026.3"} and {@code "2026.3.0"} are equal. Segments
     * that are not plain integers (a {@code "-rc1"} suffix, say) fall back to a
     * case-insensitive string comparison of that segment. {@code null} and blank
     * versions sort below every real version.
     *
     * @return a negative number if {@code left} is older than {@code right},
     *         zero if they are equivalent, a positive number if newer
     */
    public static int compare(final String left, final String right) {
        final boolean leftBlank = left == null || left.isBlank();
        final boolean rightBlank = right == null || right.isBlank();
        if (leftBlank || rightBlank) {
            return Boolean.compare(!leftBlank, !rightBlank);
        }

        final String[] leftParts = left.trim().split("\\.");
        final String[] rightParts = right.trim().split("\\.");
        final int length = Math.max(leftParts.length, rightParts.length);

        for (int i = 0; i < length; i++) {
            final String leftPart = i < leftParts.length ? leftParts[i] : "0";
            final String rightPart = i < rightParts.length ? rightParts[i] : "0";

            final Integer leftNum = parseSegment(leftPart);
            final Integer rightNum = parseSegment(rightPart);

            final int result;
            if (leftNum != null && rightNum != null) {
                result = Integer.compare(leftNum, rightNum);
            } else {
                result = leftPart.compareToIgnoreCase(rightPart);
            }

            if (result != 0) {
                return result;
            }
        }

        return 0;
    }

    /**
     * Returns {@code true} when {@code candidate} is strictly newer than
     * {@code current}.
     */
    public static boolean isNewer(final String candidate, final String current) {
        return compare(candidate, current) > 0;
    }

    private static Integer parseSegment(final String segment) {
        try {
            return Integer.valueOf(segment);
        } catch (final NumberFormatException ex) {
            return null;
        }
    }
}
