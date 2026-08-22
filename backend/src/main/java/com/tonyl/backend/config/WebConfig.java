package com.tonyl.backend.config;

import com.tonyl.backend.auth.CurrentUserArgumentResolver;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

// Single source of truth for CORS, replacing the three duplicated
// @CrossOrigin(origins = "http://localhost:5173") annotations that used to
// sit on GameController/GridItemController/PuzzleController - one hardcoded
// literal each, all three needing to be edited in lockstep for any origin
// change. allowedOrigins comes from app.cors.allowed-origins
// (application.properties), itself backed by the CORS_ALLOWED_ORIGINS env
// var so a real frontend domain can be added without a code change.
// Also the single registration point for CurrentUserArgumentResolver
// (auth's @CurrentUser support) - same "one MVC config file" rationale.
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;
    private final CurrentUserArgumentResolver currentUserArgumentResolver;

    public WebConfig(@Value("${app.cors.allowed-origins}") String[] allowedOrigins,
                      CurrentUserArgumentResolver currentUserArgumentResolver) {
        this.allowedOrigins = allowedOrigins;
        this.currentUserArgumentResolver = currentUserArgumentResolver;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins(allowedOrigins)
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("Content-Type", "Authorization");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentUserArgumentResolver);
    }
}
