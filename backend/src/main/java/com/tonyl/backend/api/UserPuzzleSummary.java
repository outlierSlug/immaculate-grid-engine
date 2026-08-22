package com.tonyl.backend.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

// cellAnswers (cellKey -> itemId) is included specifically so the frontend
// can run the existing client-side uniqueness formula against each of these
// puzzles' own /stats response, rather than the backend duplicating that
// formula server-side - see PuzzleStatsService/YourStats's existing
// "one implementation, client-side" reasoning.
public record UserPuzzleSummary(
    String puzzleId,
    String gameId,
    LocalDate puzzleDate,
    int score,
    boolean solved,
    Instant completedAt,
    Map<String, String> cellAnswers
) {}
