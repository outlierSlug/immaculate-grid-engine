package com.tonyl.backend.api;

import com.tonyl.backend.auth.ForbiddenException;
import com.tonyl.backend.auth.UnauthorizedException;
import com.tonyl.backend.puzzle.GuessLimitExceededException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.NoSuchElementException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<String> handleUnauthorized(UnauthorizedException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ex.getMessage());
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<String> handleForbidden(ForbiddenException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ex.getMessage());
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<String> handleNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    // Registered ahead of the plain IllegalStateException handler below -
    // Spring picks the most specific matching @ExceptionHandler, so this one
    // wins for a GuessLimitExceededException and the generic one still
    // handles every other IllegalStateException in the app unchanged.
    @ExceptionHandler(GuessLimitExceededException.class)
    public ResponseEntity<GuessLimitExceededResponse> handleGuessLimitExceeded(GuessLimitExceededException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new GuessLimitExceededResponse(ex.getMessage(), ex.getGuessesUsed()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleConflict(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }
}
