package com.tonyl.backend.api;

import java.util.List;
import java.util.Map;

// mostUniqueScore is null when nobody has finished this puzzle yet. you is
// null until the given sessionId has a submitted attempt for this puzzle.
// uniquenessScores is every finished attempt's live-computed score, raw and
// unordered (no session identifiers) - lets the frontend compute a
// percentile for ANY candidate score, including one from a still-in-progress
// game that has no PuzzleAttempt row yet, using the same live community data
// this same response already carries in perCell.
public record PuzzleStatsResponse(
    long gamesPlayed,
    double avgScore,
    Integer mostUniqueScore,
    Map<String, Long> scoreDistribution,
    Map<String, CellStatsResponse> perCell,
    List<Integer> uniquenessScores,
    YourStats you
) {}
