package com.tonyl.backend.api;

import java.util.List;

/**
 * Filters for an Unlimited-mode puzzle. All fields are optional: a null or
 * empty {@code dimensions} means every dimension the game offers is eligible,
 * {@code minAnswersPerCell} defaults to 1 (same floor Daily mode uses),
 * {@code requireSoftLockGuard} defaults to true (same as Daily) — Unlimited
 * is the only mode allowed to turn it off — and {@code unlimitedGuesses}
 * defaults to true, matching UnlimitedSettingsPanel's own default. The
 * resolved guess limit (null, or the fixed genre constant) is persisted on
 * the generated Puzzle itself and enforced server-side on every /guess call
 * against it, rather than trusted from the client on each guess.
 */
public record UnlimitedPuzzleRequest(
    List<String> dimensions,
    List<String> excludedCategoryIds,
    Integer minAnswersPerCell,
    Boolean requireSoftLockGuard,
    Boolean unlimitedGuesses
) {
    public static UnlimitedPuzzleRequest defaults() {
        return new UnlimitedPuzzleRequest(null, null, null, null, null);
    }
}
