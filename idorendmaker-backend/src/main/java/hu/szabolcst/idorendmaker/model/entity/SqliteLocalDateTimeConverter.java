package hu.szabolcst.idorendmaker.model.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * JPA converter that stores {@link LocalDateTime} as ISO-8601 text in SQLite.
 *
 * <p>Without this converter, Hibernate may write timestamps as epoch millis
 * (an integer) into SQLite, then fail to parse them back because the SQLite
 * JDBC driver expects a formatted date string. This converter ensures a
 * consistent text representation in both directions.
 *
 * <p>On read, the converter handles both ISO-8601 strings (the normal case)
 * and legacy epoch-millis values (in case any were written before this
 * converter was added).
 */
@Converter(autoApply = true)
public class SqliteLocalDateTimeConverter implements AttributeConverter<LocalDateTime, String> {

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

    @Override
    public String convertToDatabaseColumn(LocalDateTime attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.format(FORMATTER);
    }

    @Override
    public LocalDateTime convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }

        // Handle legacy epoch-millis values
        try {
            long epochMillis = Long.parseLong(dbData);
            return LocalDateTime.ofInstant(
                    Instant.ofEpochMilli(epochMillis), ZoneOffset.UTC);
        } catch (NumberFormatException ignored) {
            // Not a number — try date formats
        }

        // Try the standard format first
        try {
            return LocalDateTime.parse(dbData, FORMATTER);
        } catch (DateTimeParseException ignored) {
            // Fall through to ISO format
        }

        // Try ISO-8601 format (e.g. "2026-04-13T15:35:15.611")
        try {
            return LocalDateTime.parse(dbData);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(
                    "Cannot parse timestamp value: " + dbData, e);
        }
    }
}
