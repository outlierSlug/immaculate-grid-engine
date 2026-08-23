package com.tonyl.backend.api;

// One entry per date this user has completed for a given game. playedLive
// distinguishes a genuine same-day completion from one made later via
// Archive - the frontend uses this to color the two differently, since
// only the live ones count toward the account's career stats/streaks.
// score is that attempt's final score (0-9) - shown alongside the
// completed badge in the Archive list.
public record CompletedDateInfo(String date, boolean playedLive, int score) {}
