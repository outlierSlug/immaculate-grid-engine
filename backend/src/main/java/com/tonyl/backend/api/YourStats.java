package com.tonyl.backend.api;

import java.util.Map;

// Frozen facts read straight off the stored PuzzleAttempt row. Uniqueness
// score/percentile deliberately live outside this DTO now - the frontend
// derives both itself (from cellAnswers here + perCell + the sibling
// uniquenessScores list on PuzzleStatsResponse), using the exact same
// formula whether the player has finished or is still mid-game. Keeping one
// implementation of that formula (client-side) avoids it drifting from a
// second server-side copy that only applied post-submission.
public record YourStats(
    int score,
    Map<String, String> cellAnswers
) {}
