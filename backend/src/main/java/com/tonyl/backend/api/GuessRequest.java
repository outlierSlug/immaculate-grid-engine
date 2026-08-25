package com.tonyl.backend.api;

// sessionId identifies who is spending a guess against the puzzle's guess
// budget (see PuzzleService.checkGuess) - same "user:{id}" vs anonymous-UUID
// shape as everywhere else session identity is threaded through this API
// (SubmitAttemptRequest, /stats' sessionId param).
public record GuessRequest(int row, int col, String itemId, String sessionId) {}