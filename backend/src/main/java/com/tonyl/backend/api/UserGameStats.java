package com.tonyl.backend.api;

import java.util.List;

// One game's slice of a signed-in user's history. gamesPlayed/avgScore are
// true all-time aggregates for that game specifically (cheap - computed
// directly from stored score values); puzzles is capped per game (see
// UserStatsService.RECENT_PUZZLES_LIMIT) for the same reason
// UserStatsResponse's own list used to be capped overall.
//
// currentStreak/maxStreak count consecutive Daily calendar dates with a
// playedLive completion (see UserStatsService.buildGameStats) - computed
// from the same unbounded gameAttempts list as gamesPlayed/avgScore, not
// stored anywhere, per this project's everything-live-never-cached
// principle. currentStreak is 0 once the most recent completion is more
// than 1 day behind PuzzleClock.today() (the streak is broken); maxStreak
// is the longest run ever, regardless of whether it's still alive.
public record UserGameStats(
    String gameId,
    long gamesPlayed,
    double avgScore,
    int currentStreak,
    int maxStreak,
    List<UserPuzzleSummary> puzzles
) {}
