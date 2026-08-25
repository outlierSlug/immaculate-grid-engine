package com.tonyl.backend.auth;

import com.tonyl.backend.domain.User;

import org.springframework.stereotype.Component;

import java.util.Optional;

// sessionId values for signed-in users are "user:{id}" (see utils/session.ts
// on the frontend) - unlike an anonymous UUID, a sequential id is guessable,
// so any caller claiming one of these must be verified against their own
// resolved identity. Anonymous sessionIds (any value not starting with the
// prefix, including null) need no check. Shared by PuzzleStatsService (reads
// another identity's recorded attempt otherwise) and PuzzleService.checkGuess
// (spends another identity's guess budget otherwise) - both accept a
// caller-supplied sessionId that would otherwise be forgeable.
@Component
public class SessionOwnership {

    private static final String USER_SESSION_PREFIX = "user:";

    public void verify(String sessionId, Optional<User> caller) {
        if (sessionId == null || !sessionId.startsWith(USER_SESSION_PREFIX)) {
            return;
        }
        String expected = caller.map(User::getId).map(id -> USER_SESSION_PREFIX + id).orElse(null);
        if (!sessionId.equals(expected)) {
            throw new ForbiddenException("sessionId does not match the authenticated caller");
        }
    }
}
