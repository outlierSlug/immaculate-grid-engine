package com.tonyl.backend.api;

// Body for the 409 ApiExceptionHandler.handleGuessLimitExceeded returns -
// guessesUsed is the server's true, authoritative count, letting the caller
// resync its own local count instead of just learning the guess was rejected.
public record GuessLimitExceededResponse(String message, int guessesUsed) {}
