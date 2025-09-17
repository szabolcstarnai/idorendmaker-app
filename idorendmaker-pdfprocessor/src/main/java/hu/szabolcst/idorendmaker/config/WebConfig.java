package hu.szabolcst.idorendmaker.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@EnableWebMvc
@Configuration
public class WebConfig implements WebMvcConfigurer {

	@Value("${spring.profiles.active:}")
	private String activeProfile;

	@Override
	public void addCorsMappings(final CorsRegistry registry) {
		final CorsRegistration corsRegistration = registry.addMapping("/**")
				.allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
				.allowedHeaders("*")
				.allowCredentials(true)
				.maxAge(3600);

		// Profile-specific CORS configuration
		if ("desktop".equals(activeProfile)) {
			// Desktop app needs only localhost
			corsRegistration.allowedOrigins("http://localhost:*");
		} else if ("dev".equals(activeProfile)) {
			// Development needs Vite's default port and others
			corsRegistration.allowedOrigins(
					"http://localhost:5173",
					"http://localhost:8080",
					"http://127.0.0.1:5173"
			);
		} else {
			// Server deployment - get from environment or use default
			final String allowedOrigins = System.getenv("ALLOWED_ORIGINS");
			if (allowedOrigins != null && !allowedOrigins.isEmpty()) {
				corsRegistration.allowedOrigins(allowedOrigins.split(","));
			} else {
				// Fallback to allow all - customize this for production
				corsRegistration.allowedOriginPatterns("*");
			}
		}
	}

}
