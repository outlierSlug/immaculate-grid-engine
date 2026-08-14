package com.tonyl.backend.api;

import java.util.List;

/**
 * Filters for an Unlimited-mode puzzle. All fields are optional: a null or
 * empty {@code dimensions} means every dimension the game offers is eligible,
 * and {@code minAnswersPerCell} defaults to 1 (same floor Daily mode uses).
 */
public record UnlimitedPuzzleRequest(
    List<String> dimensions,
    List<String> excludedCategoryIds,
    Integer minAnswersPerCell
) {
    public static UnlimitedPuzzleRequest defaults() {
        return new UnlimitedPuzzleRequest(null, null, null);
    }
}
