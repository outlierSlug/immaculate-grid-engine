package com.tonyl.backend.puzzle;

// Carries the true, server-side guessesUsed count alongside the rejection so
// a caller can resync instead of just learning "no" - see ApiExceptionHandler
// for how this becomes a structured 409 body. Extends IllegalStateException
// (rather than a plain RuntimeException) so ApiExceptionHandler's existing
// generic IllegalStateException -> 409 mapping still applies to anything that
// doesn't need the richer body, and so the pre-existing
// PuzzleServiceGuessLimitTest assertions (assertThrows(IllegalStateException.
// class, ...)) keep passing unchanged - a subclass satisfies them exactly
// like the plain exception it replaces did.
public class GuessLimitExceededException extends IllegalStateException {

    private final int guessesUsed;

    public GuessLimitExceededException(String message, int guessesUsed) {
        super(message);
        this.guessesUsed = guessesUsed;
    }

    public int getGuessesUsed() {
        return guessesUsed;
    }
}
