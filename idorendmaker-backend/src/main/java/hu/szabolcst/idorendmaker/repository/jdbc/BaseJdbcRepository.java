package hu.szabolcst.idorendmaker.repository.jdbc;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;

@Slf4j
public abstract class BaseJdbcRepository<T, ID> {

    @Autowired
    protected JdbcTemplate jdbcTemplate;
    protected final Class<T> entityClass;
    protected final BeanPropertyRowMapper<T> rowMapper;

    protected BaseJdbcRepository(final Class<T> entityClass) {
        this.entityClass = entityClass;
        this.rowMapper = new BeanPropertyRowMapper<>(entityClass);
    }

    public List<T> findAll() {
        final String sql = "SELECT * FROM " + getTableName();
        return this.jdbcTemplate.query(sql, (RowMapper) this.rowMapper);
    }

    public Optional<T> findById(final ID id) {
        try {
            final String sql = "SELECT * FROM " + getTableName() + " WHERE " + getIdColumnName() + " = ?";
            final T entity = (T) this.jdbcTemplate.queryForObject(sql, (RowMapper) this.rowMapper, new Object[]{id});
            return Optional.ofNullable(entity);
        } catch (final Exception e) {
            return Optional.empty();
        }
    }

    public long count() {
        final String sql = "SELECT COUNT(*) FROM " + getTableName();
        return this.jdbcTemplate.queryForObject(sql, Long.class);
    }

    public void deleteById(final ID id) {
        final String sql = "DELETE FROM " + getTableName() + " WHERE " + getIdColumnName() + " = ?";
        this.jdbcTemplate.update(sql, id);
    }

    public void deleteAll() {
        final String sql = "DELETE FROM " + getTableName();
        this.jdbcTemplate.update(sql);
    }

    public void deleteAll(final Iterable<? extends T> entities) {
        final List<ID> ids = StreamSupport.stream(entities.spliterator(), false).map(this::getId).filter(id -> (id != null))
            .collect(Collectors.toList());

        if (ids.isEmpty()) {
            return;
        }

        final StringBuilder sql = new StringBuilder("DELETE FROM " + getTableName() + " WHERE " + getIdColumnName() + " IN (");
        for (int i = 0; i < ids.size(); i++) {
            if (i > 0) {
                sql.append(", ");
            }
            sql.append("?");
        }
        sql.append(")");

        this.jdbcTemplate.update(sql.toString(), ids.toArray());
    }

    public void delete(final T entity) {
        deleteAll(List.of(entity));
    }

    public boolean existsById(final ID id) {
        final String sql = "SELECT COUNT(*) FROM " + getTableName() + " WHERE " + getIdColumnName() + " = ?";
        final Integer count = this.jdbcTemplate.queryForObject(sql, Integer.class, id);
        return (count > 0);
    }

    public T save(final T entity) {
        final ID id = getId(entity);
        if (id == null) {
            return insert(entity);
        }
        return update(entity);
    }

    public List<T> saveAll(final Iterable<T> entities) {
        final List<T> result = new ArrayList<>();
        for (final T entity : entities) {
            result.add(save(entity));
        }
        return result;
    }

    protected T insert(final T entity) {
        final GeneratedKeyHolder generatedKeyHolder = new GeneratedKeyHolder();
        final String sql = getInsertSql();
        this.jdbcTemplate.update(connection -> {
            final PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            try {
                setInsertParameters(ps, (T) entity);
            } catch (final Exception e) {
                throw new RuntimeException(e);
            }

            return ps;
        }, generatedKeyHolder);

        final Number generatedId = generatedKeyHolder.getKey();
        if (generatedId != null) {
            setId(entity, (ID) generatedId);
        }

        return entity;
    }


    protected T update(final T entity) {
        final String sql = getUpdateSql();
        final ID entityId = getId(entity);

        log.debug("🔄 UPDATE operation starting for entity ID: {}", entityId);
        log.debug("📝 UPDATE SQL: {}", sql);

        final int rowsAffected = this.jdbcTemplate.update(connection -> {
            final PreparedStatement ps = connection.prepareStatement(sql);
            try {
                log.debug("🔧 Setting UPDATE parameters for entity ID: {}", entityId);
                setUpdateParameters(ps, entity);

                // GraalVM fix: Explicit connection auto-commit handling
                if (connection.getAutoCommit()) {
                    log.warn("⚠️ Connection has autoCommit=true, forcing to false for UPDATE");
                    connection.setAutoCommit(false);
                }

                log.debug("✅ UPDATE parameters set successfully for entity ID: {}", entityId);
            } catch (final Exception e) {
                log.error("❌ Failed to set update parameters for entity ID: {}", entityId, e);
                throw new RuntimeException("Failed to set update parameters", e);
            }
            return ps;
        });

        log.debug("📊 UPDATE operation completed. Rows affected: {} for entity ID: {}", rowsAffected, entityId);

        if (rowsAffected == 0) {
            log.error("❌ UPDATE failed: no rows affected for entity ID: {}", entityId);
            throw new RuntimeException("Update failed: no rows affected for entity with ID " + entityId);
        }

        // GraalVM fix: Verify transaction state for UPDATE operations
        try {
            this.jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            log.debug("✅ Connection verification successful after UPDATE operation on entity ID: {}", entityId);
        } catch (final Exception e) {
            log.warn("⚠️ Connection verification failed after UPDATE: {}", e.getMessage());
        }

        log.info("🎉 UPDATE operation successful for entity ID: {}", entityId);
        return entity;
    }

    protected abstract String getTableName();

    protected abstract String getIdColumnName();

    protected abstract String getInsertSql();

    protected abstract String getUpdateSql();

    protected abstract void setInsertParameters(PreparedStatement paramPreparedStatement, T paramT) throws Exception;

    protected abstract void setUpdateParameters(PreparedStatement paramPreparedStatement, T paramT) throws Exception;

    protected abstract ID getId(T paramT);

    protected abstract void setId(T paramT, ID paramID);
}