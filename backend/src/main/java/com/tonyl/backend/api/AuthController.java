package com.tonyl.backend.api;

import com.tonyl.backend.auth.CurrentUser;
import com.tonyl.backend.domain.LoginCode;
import com.tonyl.backend.domain.User;
import com.tonyl.backend.domain.UserSession;
import com.tonyl.backend.repository.LoginCodeRepository;
import com.tonyl.backend.repository.UserRepository;
import com.tonyl.backend.repository.UserSessionRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final LoginCodeRepository loginCodeRepository;
    private final UserSessionRepository userSessionRepository;
    private final UserRepository userRepository;
    private final long sessionTtlDays;

    public AuthController(LoginCodeRepository loginCodeRepository,
                           UserSessionRepository userSessionRepository,
                           UserRepository userRepository,
                           @Value("${app.auth.session-ttl-days}") long sessionTtlDays) {
        this.loginCodeRepository = loginCodeRepository;
        this.userSessionRepository = userSessionRepository;
        this.userRepository = userRepository;
        this.sessionTtlDays = sessionTtlDays;
    }

    // Exchanges the short-lived, single-use code from the OAuth redirect's
    // URL fragment for the real bearer token - see GoogleAuthSuccessHandler
    // and LoginCode's doc comments for why the real token never touches a URL.
    @PostMapping("/exchange")
    public AuthResponse exchange(@RequestBody ExchangeCodeRequest request) {
        LoginCode loginCode = loginCodeRepository.findByCode(request.code())
            .orElseThrow(() -> new IllegalArgumentException("Invalid or expired code"));
        if (loginCode.isConsumed() || loginCode.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Invalid or expired code");
        }
        loginCode.markConsumed();
        loginCodeRepository.save(loginCode);

        User user = userRepository.findById(loginCode.getUserId())
            .orElseThrow(() -> new NoSuchElementException("User not found"));

        UserSession session = new UserSession(
            UUID.randomUUID().toString(),
            user.getId(),
            Instant.now(),
            Instant.now().plus(sessionTtlDays, ChronoUnit.DAYS)
        );
        userSessionRepository.save(session);

        return new AuthResponse(session.getToken(), UserResponse.from(user));
    }

    // Deletes whatever session the caller's own bearer token identifies -
    // possessing the token is already proof of the session being logged
    // out, no need to resolve/require a full @CurrentUser lookup first.
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            userSessionRepository.deleteByToken(authHeader.substring("Bearer ".length()));
        }
        return ResponseEntity.noContent().build();
    }

    // Lets the frontend revalidate a stored token on load - 401s (via
    // CurrentUserArgumentResolver) if it's missing, garbage, or expired.
    @GetMapping("/me")
    public UserResponse me(@CurrentUser User user) {
        return UserResponse.from(user);
    }
}
