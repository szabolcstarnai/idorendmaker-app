package hu.szabolcst.idorendmaker.config;

import javax.sql.DataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.TransactionDefinition;

@Slf4j
public class SQLiteDataSourceTransactionManager
    extends DataSourceTransactionManager {

    public SQLiteDataSourceTransactionManager() {
        log.info("🗄️ Initializing SQLite-aware transaction manager");
    }

    public SQLiteDataSourceTransactionManager(final DataSource dataSource) {
        super(dataSource);
        log.info("🗄️ Initializing SQLite-aware transaction manager with DataSource");
    }

    protected void doBegin(final Object transaction, final TransactionDefinition definition) {
        if (log.isDebugEnabled()) {
            log.debug("🔄 Beginning SQLite transaction - readOnly: {}, isolation: {}, timeout: {}", definition.isReadOnly(),
                definition.getIsolationLevel(),
                definition.getTimeout());
        }

        try {
            super.doBegin(transaction, definition);
        } catch (final Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("Cannot change read-only flag")) {
                log.warn("⚠️ SQLite read-only flag error caught and handled gracefully: {}", e.getMessage());
                log.debug("✅ Continuing with SQLite transaction without read-only flag optimization");
            } else {
                throw e;
            }
        }
    }

    protected boolean isExistingTransaction(final Object transaction) {
        final boolean existing = super.isExistingTransaction(transaction);
        if (log.isTraceEnabled()) {
            log.trace("🔍 SQLite transaction existence check: {}", existing);
        }
        return existing;
    }
}
