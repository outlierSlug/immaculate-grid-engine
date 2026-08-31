package com.tonyl.backend.api;

// guessesUsed is the server's authoritative post-guess count (null for an
// unlimited puzzle with no guess budget at all) - see PuzzleService.
// checkGuess's own comment on why the frontend should trust this over its
// own locally-computed count.
public record GuessResponse(boolean correct, String itemId, String displayName, String imageUrl, Integer guessesUsed) {}