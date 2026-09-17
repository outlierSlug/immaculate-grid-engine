package com.tonyl.backend.puzzle;

import com.tonyl.backend.api.CollectionEntry;
import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.domain.PuzzleAttempt;
import com.tonyl.backend.domain.PuzzleMode;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Plain JUnit, hand-built fixtures, no Spring context - same convention as
// UserStatsServiceTest.
class UserCollectionServiceTest {

    private static final UserCollectionService service = new UserCollectionService(null, null);
    private static final LocalDate DAY_1 = LocalDate.of(2026, 9, 1);
    private static final LocalDate DAY_2 = LocalDate.of(2026, 9, 2);
    private static final LocalDate DAY_3 = LocalDate.of(2026, 9, 3);

    private static Puzzle daily(String gameId, LocalDate date) {
        return new Puzzle(gameId + ":" + date, gameId, date, PuzzleMode.DAILY, null, List.of(), List.of(), Map.of());
    }

    private static PuzzleAttempt attempt(String gameId, LocalDate date, Map<String, String> cellAnswers) {
        return new PuzzleAttempt(gameId + ":" + date, "user:1", cellAnswers, cellAnswers.size(), 9, false, false,
            1000L, Instant.now(), true);
    }

    private static Map<String, Puzzle> puzzles(Puzzle... puzzles) {
        return List.of(puzzles).stream().collect(Collectors.toMap(Puzzle::getId, p -> p));
    }

    private static Map<String, CollectionEntry> byItem(List<CollectionEntry> entries) {
        return entries.stream().collect(Collectors.toMap(CollectionEntry::itemId, e -> e));
    }

    @Test
    void noAttemptsMeansEmptyCollection() {
        assertTrue(service.buildCollection("genshin", List.of(), Map.of(), null).isEmpty());
    }

    @Test
    void countsDistinctDailiesPerItemWithDatesInOrder() {
        List<PuzzleAttempt> attempts = List.of(
            attempt("genshin", DAY_3, Map.of("0-0", "genshin:furina", "0-1", "genshin:bennett")),
            attempt("genshin", DAY_1, Map.of("1-1", "genshin:furina")),
            attempt("genshin", DAY_2, Map.of("2-2", "genshin:furina")));

        Map<String, CollectionEntry> collection = byItem(service.buildCollection("genshin", attempts,
            puzzles(daily("genshin", DAY_1), daily("genshin", DAY_2), daily("genshin", DAY_3)), null));

        assertEquals(2, collection.size());
        assertEquals(3, collection.get("genshin:furina").timesCollected());
        assertEquals(List.of(DAY_1, DAY_2, DAY_3), collection.get("genshin:furina").collectedDates());
        assertEquals(1, collection.get("genshin:bennett").timesCollected());
        assertEquals(List.of(DAY_3), collection.get("genshin:bennett").collectedDates());
    }

    @Test
    void otherGamesAttemptsAreIgnored() {
        List<PuzzleAttempt> attempts = List.of(
            attempt("genshin", DAY_1, Map.of("0-0", "genshin:furina")),
            attempt("starrail", DAY_1, Map.of("0-0", "starrail:kafka")));

        List<CollectionEntry> collection = service.buildCollection("genshin", attempts,
            puzzles(daily("genshin", DAY_1), daily("starrail", DAY_1)), null);

        assertEquals(List.of("genshin:furina"), collection.stream().map(CollectionEntry::itemId).toList());
    }

    @Test
    void beforeExcludesThatDateAndLater() {
        List<PuzzleAttempt> attempts = List.of(
            attempt("genshin", DAY_1, Map.of("0-0", "genshin:furina")),
            attempt("genshin", DAY_2, Map.of("0-0", "genshin:furina", "0-1", "genshin:bennett")),
            attempt("genshin", DAY_3, Map.of("0-0", "genshin:furina")));

        Map<String, CollectionEntry> collection = byItem(service.buildCollection("genshin", attempts,
            puzzles(daily("genshin", DAY_1), daily("genshin", DAY_2), daily("genshin", DAY_3)), DAY_2));

        assertEquals(1, collection.size());
        assertEquals(1, collection.get("genshin:furina").timesCollected());
    }
}
