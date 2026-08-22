package com.tonyl.backend.api;

import java.util.List;

// Organized by game, not combined - a user's Genshin and Brawl Stars
// histories are shown separately rather than blended into one number that
// wouldn't mean much across two different puzzle rosters. See UserGameStats
// for what's inside each entry, including its own windowed-puzzles caveat.
public record UserStatsResponse(
    List<UserGameStats> games
) {}
