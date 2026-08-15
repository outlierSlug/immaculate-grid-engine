package com.tonyl.backend.api;

import java.util.List;

// totalAttempts is every finished game for the puzzle (the shared
// denominator across all cells); correctAttempts is how many of those
// actually solved this specific cell - the denominator each answer's
// percent is computed against.
public record CellStatsResponse(long totalAttempts, long correctAttempts, List<CellAnswerStat> answers) {}
