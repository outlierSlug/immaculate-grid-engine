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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
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

    // Hard-deletes the account (users row) and every session it has (this
    // device and any other - the one authorizing this very request
    // included), so the token used to call this stops working immediately
    // after. Deliberately does NOT touch puzzle_attempts: those rows carry
    // no identifying field beyond the "user:{id}" sessionId string, which
    // becomes exactly as anonymous as a random UUID once this users row is
    // gone - same treatment anonymous play's history always had. A later
    // sign-in with the same Google account finds no matching googleSub and
    // creates a brand-new User row (see GoogleAuthSuccessHandler) - deletion
    // is permanent, not a suspend/restore.
    // @Transactional so the session wipe and the user delete commit as one
    // unit - without it they're two independent transactions (each already
    // wrapped on its own, see UserSessionRepository's deleteByToken comment),
    // and a crash between them would leave a userless orphaned account.
    @Transactional
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount(@CurrentUser User user) {
        userSessionRepository.deleteByUserId(user.getId());
        userRepository.delete(user);
        return ResponseEntity.noContent().build();
    }
}
