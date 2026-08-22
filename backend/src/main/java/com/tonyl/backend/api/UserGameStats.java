package com.tonyl.backend.api;

import java.util.List;

// One game's slice of a signed-in user's history. gamesPlayed/avgScore are
// true all-time aggregates for that game specifically (cheap - computed
// directly from stored score values); puzzles is capped per game (see
// UserStatsService.RECENT_PUZZLES_LIMIT) for the same reason
// UserStatsResponse's own list used to be capped overall.
public record UserGameStats(
    String gameId,
    long gamesPlayed,
    double avgScore,
    List<UserPuzzleSummary> puzzles
) {}
