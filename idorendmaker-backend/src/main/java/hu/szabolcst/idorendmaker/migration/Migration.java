package hu.szabolcst.idorendmaker.migration;

/**
 * Represents a database migration file.
 *
 * Migration files should be named: V{timestamp}__description.sql Example: V20250101120530__update_races.sql
 */
public record Migration(String version, String description, String scriptName, String content) implements Comparable<Migration> {

    @Override
    public int compareTo(final Migration other) {
        return this.version.compareTo(other.version);
    }

    /**
     * Parses a migration filename to extract version and description.
     *
     * Expected format: V{version}__{description}.sql Example: V20250101120530__update_races.sql
     */
    public static Migration fromResource(final String filename, final String content) {
        if (!filename.startsWith("V") || !filename.endsWith(".sql")) {
            throw new IllegalArgumentException(
                "Migration filename must start with 'V' and end with '.sql': " + filename
            );
        }

        final String nameWithoutExtension = filename.substring(0, filename.length() - 4);
        final String[] parts = nameWithoutExtension.split("__", 2);

        if (parts.length != 2) {
            throw new IllegalArgumentException(
                "Migration filename must follow format V{version}__{description}.sql: " + filename
            );
        }

        final String version = parts[0].substring(1); // Remove 'V' prefix
        final String description = parts[1].replace("_", " ");

        return new Migration(version, description, filename, content);
    }
}
