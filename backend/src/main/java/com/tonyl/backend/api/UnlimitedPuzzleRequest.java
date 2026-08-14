package com.tonyl.backend.api;

import java.util.List;

/**
 * Filters for an Unlimited-mode puzzle. All fields are optional: a null or
 * empty {@code dimensions} means every dimension the game offers is eligible,
 * {@code minAnswersPerCell} defaults to 1 (same floor Daily mode uses), and
 * {@code requireSoftLockGuard} defaults to true (same as Daily) — Unlimited
 * is the only mode allowed to turn it off.
 */
public record UnlimitedPuzzleRequest(
    List<String> dimensions,
    List<String> excludedCategoryIds,
    Integer minAnswersPerCell,
    Boolean requireSoftLockGuard
) {
    public static UnlimitedPuzzleRequest defaults() {
        return new UnlimitedPuzzleRequest(null, null, null, null);
    }
}
