package com.tonyl.backend.auth;

// Caller is authenticated (or not) but not allowed to act as the sessionId
// they supplied - see PuzzleStatsService's "user:" ownership check. Mapped
// to 403 by ApiExceptionHandler.
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
