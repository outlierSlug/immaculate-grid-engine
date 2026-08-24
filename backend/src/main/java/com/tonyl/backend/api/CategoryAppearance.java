package com.tonyl.backend.api;

import java.time.LocalDate;

// lastAppearanceDate/daysSinceLastAppearance are both null when appearances
// is 0 - a category value that's never been drawn has no "last appearance"
// to report. Both are relative to whatever puzzle set this particular
// window (all-time or trailing-30-day) was built from, same as every other
// field here - see AdminTrackingService.buildWindow.
public record CategoryAppearance(
    String dimension,
    String categoryId,
    String label,
    int appearances,
    double appearanceRatePct,
    LocalDate lastAppearanceDate,
    Integer daysSinceLastAppearance
) {}
