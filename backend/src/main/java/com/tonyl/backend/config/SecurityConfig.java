package com.tonyl.backend.config;

import com.tonyl.backend.auth.GoogleAuthSuccessHandler;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.web.SecurityFilterChain;

// Spring Security is used here for exactly one thing: the actual Google
// OAuth2 authorization-code exchange, which is genuinely worth not
// hand-rolling. It is NOT used as this API's authorization layer - every
// request is permitted through this filter chain, and real per-request
// auth for the REST API is fully custom (see auth/CurrentUserArgumentResolver),
// resolving a @CurrentUser controller parameter from the Authorization
// header, completely independent of Spring Security's request context.
//
// IMPORTANT sequencing note: adding spring-boot-starter-oauth2-client pulls
// in Spring Security transitively, which auto-configures a login-form wall
// in front of every endpoint the moment the dependency lands - this class
// (specifically the permitAll() below) must exist from that same point on,
// or every existing public endpoint (e.g. /api/items) breaks.
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, GoogleAuthSuccessHandler successHandler,
                                                     OAuth2AuthorizationRequestResolver authorizationRequestResolver) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            // Stateless JSON API - no session-backed forms anywhere else in
            // this app. Session management itself is left at its default
            // (not STATELESS) since oauth2Login's authorization-request
            // repository needs the session for the redirect round-trip to
            // Google; nothing else in the app ever reads or writes it.
            .csrf(csrf -> csrf.disable())
            .oauth2Login(oauth2 -> oauth2
                .authorizationEndpoint(endpoint -> endpoint.authorizationRequestResolver(authorizationRequestResolver))
                .successHandler(successHandler));
        return http.build();
    }

    // Without this, "Sign in with Google" silently reuses whichever Google
    // account is already active in the browser - there was no way to switch
    // accounts on the same device short of signing out of Google itself
    // first. prompt=select_account forces Google's account chooser on every
    // sign-in click; it doesn't affect already-persisted app sessions (the
    // bearer token in localStorage), only the moment a user explicitly
    // starts a new OAuth flow.
    @Bean
    public OAuth2AuthorizationRequestResolver authorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository) {
        var resolver = new DefaultOAuth2AuthorizationRequestResolver(clientRegistrationRepository, "/oauth2/authorization");
        resolver.setAuthorizationRequestCustomizer(customizer ->
            customizer.additionalParameters(params -> params.put("prompt", "select_account")));
        return resolver;
    }
}
