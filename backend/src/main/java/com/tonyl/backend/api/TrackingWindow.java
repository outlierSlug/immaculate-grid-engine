package com.tonyl.backend.api;

import java.time.LocalDate;
import java.util.List;

public record TrackingWindow(
    LocalDate windowStart,
    LocalDate windowEnd,
    int puzzleCount,
    List<CharacterAppearance> characters,
    List<CategoryAppearance> categories,
    List<DimensionPairing> pairings
) {}
