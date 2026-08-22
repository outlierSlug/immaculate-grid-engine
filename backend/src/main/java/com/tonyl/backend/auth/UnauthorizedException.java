package com.tonyl.backend.auth;

// Missing, invalid, or expired Authorization header where one is required.
// Mapped to 401 by ApiExceptionHandler.
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
