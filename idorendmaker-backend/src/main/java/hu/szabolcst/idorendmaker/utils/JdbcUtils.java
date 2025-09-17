package hu.szabolcst.idorendmaker.utils;

import java.sql.ResultSet;
import java.sql.SQLException;


public final class JdbcUtils {

    public static Integer getIntegerOrNull(final ResultSet rs, final String columnName) throws SQLException {
        final Object obj = rs.getObject(columnName);
        if (obj == null || rs.wasNull()) {
            return null;
        }
        if (obj instanceof Number) {
            return ((Number) obj).intValue();
        }

        try {
            return Integer.valueOf(obj.toString());
        } catch (final NumberFormatException e) {
            return null;
        }
    }


    public static int getIntOrDefault(final ResultSet rs, final String columnName, final int defaultValue) throws SQLException {
        final Integer value = getIntegerOrNull(rs, columnName);
        return (value != null) ? value : defaultValue;
    }


    public static Float getFloatOrNull(final ResultSet rs, final String columnName) throws SQLException {
        final Object obj = rs.getObject(columnName);
        if (obj == null || rs.wasNull()) {
            return null;
        }
        if (obj instanceof Number) {
            return ((Number) obj).floatValue();
        }
        try {
            return Float.valueOf(obj.toString());
        } catch (final NumberFormatException e) {
            return null;
        }
    }


    public static Long getLongOrNull(final ResultSet rs, final String columnName) throws SQLException {
        final Object obj = rs.getObject(columnName);
        if (obj == null || rs.wasNull()) {
            return null;
        }
        if (obj instanceof Number) {
            return ((Number) obj).longValue();
        }
        try {
            return Long.valueOf(obj.toString());
        } catch (final NumberFormatException e) {
            return null;
        }
    }
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmake\\utils\JdbcUtils.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */