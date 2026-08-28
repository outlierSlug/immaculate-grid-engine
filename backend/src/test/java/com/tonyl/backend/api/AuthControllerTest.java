package com.tonyl.backend.api;

import com.tonyl.backend.domain.LoginCode;
import com.tonyl.backend.domain.User;
import com.tonyl.backend.repository.LoginCodeRepository;
import com.tonyl.backend.repository.UserRepository;
import com.tonyl.backend.repository.UserSessionRepository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

// Proves POST /api/auth/exchange enforces a login code's single-use
// contract for real - the actual gap this suite exists to close. The old
// implementation (findByCode + isConsumed()/isBefore() check + save())
// only enforced this for sequential calls; LoginCodeRepository.tryConsume's
// own doc comment explains the concurrent-request race that allowed. Needs
// real persistence (the atomic conditional UPDATE the fix depends on), same
// rationale as PuzzleServiceGuessLimitTest for why this isn't a plain JUnit
// test.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AuthControllerTest {

    @Autowired
    private LoginCodeRepository loginCodeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserSessionRepository userSessionRepository;

    private AuthController newController() {
        return new AuthController(loginCodeRepository, userSessionRepository, userRepository, 30L);
    }

    private User saveUser(String googleSub) {
        return userRepository.save(new User(googleSub, googleSub + "@example.com", "Player", null, Instant.now()));
    }

    @Test
    void aSecondExchangeOfTheSameCodeIsRejected() {
        User user = saveUser("google-sub-exchange-twice");
        loginCodeRepository.save(new LoginCode("code-used-once", user.getId(), Instant.now().plus(5, ChronoUnit.MINUTES)));
        AuthController controller = newController();

        controller.exchange(new ExchangeCodeRequest("code-used-once"));
        assertThrows(IllegalArgumentException.class,
            () -> controller.exchange(new ExchangeCodeRequest("code-used-once")),
            "a login code is single-use - a second exchange must be rejected, not silently mint a second session");

        long sessionsForUser = userSessionRepository.findAll().stream()
            .filter(s -> s.getUserId().equals(user.getId()))
            .count();
        assertEquals(1, sessionsForUser, "exactly one session should exist, from the first exchange only");
    }

    @Test
    void anExpiredCodeIsRejected() {
        User user = saveUser("google-sub-expired-code");
        loginCodeRepository.save(new LoginCode("code-expired", user.getId(), Instant.now().minus(1, ChronoUnit.MINUTES)));
        AuthController controller = newController();

        assertThrows(IllegalArgumentException.class,
            () -> controller.exchange(new ExchangeCodeRequest("code-expired")));
    }

    @Test
    void anUnknownCodeIsRejected() {
        AuthController controller = newController();

        assertThrows(IllegalArgumentException.class,
            () -> controller.exchange(new ExchangeCodeRequest("code-that-was-never-issued")));
    }
}
