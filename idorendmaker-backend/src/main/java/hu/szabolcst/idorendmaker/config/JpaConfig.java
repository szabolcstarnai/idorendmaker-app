package hu.szabolcst.idorendmaker.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EnableJpaRepositories(basePackages = "hu.szabolcst.idorendmaker.repository")
public class JpaConfig {
}
