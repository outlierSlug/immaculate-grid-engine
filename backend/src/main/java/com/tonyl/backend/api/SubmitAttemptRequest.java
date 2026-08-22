package com.tonyl.backend.api;

import java.util.Map;

// playedLive: true iff this attempt was made via the canonical /today route
// on the puzzle's own live day; false if made via /archive. Set explicitly
// by the frontend at submission time (it already knows unambiguously which
// route the player used) rather than inferred later from completedAt vs
// puzzleDate - inferring it would mean re-deriving "what day was it" from
// timestamps every time, the same timezone-boundary problem this project
// has already been bitten by once. Community-level stats (PuzzleStatsService)
// count every attempt regardless of this flag; only a signed-in user's own
// personal aggregate (UserStatsService, and the planned streaks feature)
// filters by it, so "games played" stays a signal of genuine daily
// engagement rather than something inflatable by binge-playing the archive.
public record SubmitAttemptRequest(
    String sessionId,
    Map<String, String> cellAnswers,
    int score,
    int guessesUsed,
    boolean solved,
    boolean gaveUp,
    long elapsedMs,
    boolean playedLive
) {}
