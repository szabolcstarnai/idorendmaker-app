package hu.szabolcst.idorendmaker.utils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class CatalogVersionsTest {

    @ParameterizedTest
    @CsvSource({
        "2026.3.1, 2026.3.0",
        "2026.3.1, 2026.2.9",
        "2027.0.0, 2026.9.9",
        "2026.4,   2026.3.9",
    })
    @DisplayName("orders a newer catalog version above an older one")
    void newerVersionsCompareGreater(final String newer, final String older) {
        assertTrue(CatalogVersions.compare(newer, older) > 0,
            newer + " should be newer than " + older);
        assertTrue(CatalogVersions.compare(older, newer) < 0,
            older + " should be older than " + newer);
    }

    @Test
    @DisplayName("compares double-digit segments numerically, not lexicographically")
    void doubleDigitSegmentsCompareNumerically() {
        // The bug this guards: String.compareTo puts "2026.10.0" *below*
        // "2026.3.1", so an available update would be reported as up to date.
        assertTrue(CatalogVersions.isNewer("2026.10.0", "2026.3.1"));
        assertTrue(CatalogVersions.isNewer("2026.3.10", "2026.3.9"));
        assertFalse(CatalogVersions.isNewer("2026.3.1", "2026.10.0"));
    }

    @Test
    @DisplayName("treats missing trailing segments as zero")
    void missingSegmentsCountAsZero() {
        assertEquals(0, CatalogVersions.compare("2026.3", "2026.3.0"));
        assertEquals(0, CatalogVersions.compare("2026", "2026.0.0"));
        assertTrue(CatalogVersions.isNewer("2026.3.1", "2026.3"));
    }

    @Test
    @DisplayName("sorts null and blank versions below every real version")
    void blankVersionsSortLowest() {
        assertTrue(CatalogVersions.isNewer("2026.3.1", null));
        assertTrue(CatalogVersions.isNewer("2026.3.1", ""));
        assertTrue(CatalogVersions.isNewer("2026.3.1", "   "));
        assertFalse(CatalogVersions.isNewer(null, "2026.3.1"));
        assertEquals(0, CatalogVersions.compare(null, ""));
    }

    @Test
    @DisplayName("falls back to string comparison for non-numeric segments")
    void nonNumericSegmentsFallBackToStringCompare() {
        assertEquals(0, CatalogVersions.compare("2026.3.1-rc1", "2026.3.1-rc1"));
        assertTrue(CatalogVersions.isNewer("2026.3.1-rc2", "2026.3.1-rc1"));
        // A numeric major still wins before the suffix is ever reached.
        assertTrue(CatalogVersions.isNewer("2027.0.0", "2026.3.1-rc9"));
    }

    @Test
    @DisplayName("reports equal versions as not newer")
    void equalVersionsAreNotNewer() {
        assertFalse(CatalogVersions.isNewer("2026.3.1", "2026.3.1"));
        assertEquals(0, CatalogVersions.compare("2026.3.1", "2026.3.1"));
    }
}
