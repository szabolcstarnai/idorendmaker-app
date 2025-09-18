package hu.szabolcst.idorendmaker;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Slf4j
@SpringBootApplication
@EnableTransactionManagement(
    // GraalVM compatibility settings for transaction management
    proxyTargetClass = true  // Use CGLIB proxies instead of JDK dynamic proxies
)
public class IdorendMakerApplication {

    public static void main(final String[] args) {
        log.info("🚀 Starting Időrend Maker Backend with GraalVM UPDATE operation fixes");
        log.info("🔧 Transaction management enabled with GraalVM-compatible settings");
        SpringApplication.run(IdorendMakerApplication.class, args);
    }
}
