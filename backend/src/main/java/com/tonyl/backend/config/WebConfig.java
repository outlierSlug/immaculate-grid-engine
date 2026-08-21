package com.tonyl.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// Single source of truth for CORS, replacing the three duplicated
// @CrossOrigin(origins = "http://localhost:5173") annotations that used to
// sit on GameController/GridItemController/PuzzleController - one hardcoded
// literal each, all three needing to be edited in lockstep for any origin
// change. allowedOrigins comes from app.cors.allowed-origins
// (application.properties), itself backed by the CORS_ALLOWED_ORIGINS env
// var so a real frontend domain can be added without a code change.
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public WebConfig(@Value("${app.cors.allowed-origins}") String[] allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins(allowedOrigins)
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
    }
}
