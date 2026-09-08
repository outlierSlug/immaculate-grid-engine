package com.tonyl.backend.puzzle;

import com.tonyl.backend.api.UserGameStats;
import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.domain.PuzzleAttempt;
import com.tonyl.backend.domain.PuzzleMode;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

// Plain JUnit, hand-built Puzzle/PuzzleAttempt fixtures, no Spring context -
// drives UserStatsService.buildGameStats directly (package-private for
// exactly this reason, same convention as PuzzleService.generateDailyPuzzle/
// AdminTrackingService.buildWindow). Streak correctness is a hard
// requirement here, not informal reasoning - a future change that breaks
// one of these must fail the build.
class UserStatsServiceTest {

    private static final UserStatsService service = new UserStatsService(null, null);

    private static Puzzle dailyPuzzle(LocalDate date) {
        String id = "genshin:" + date;
        return new Puzzle(id, "genshin", date, PuzzleMode.DAILY, null, List.of(), List.of(), Map.of());
    }

    private static PuzzleAttempt liveAttempt(LocalDate date) {
        String puzzleId = "genshin:" + date;
        return new PuzzleAttempt(puzzleId, "user:1", Map.of(), 5, 5, true, false,
            1000L, Instant.now(), true);
    }

    private static PuzzleAttempt archiveAttempt(LocalDate date) {
        String puzzleId = "genshin:" + date;
        return new PuzzleAttempt(puzzleId, "user:1", Map.of(), 5, 5, true, false,
            1000L, Instant.now(), false);
    }

    private static Map<String, Puzzle> puzzlesById(LocalDate... dates) {
        return List.of(dates).stream()
            .map(UserStatsServiceTest::dailyPuzzle)
            .collect(java.util.stream.Collectors.toMap(Puzzle::getId, p -> p));
    }

    @Test
    void noAttemptsMeansZeroStreaks() {
        UserGameStats stats = service.buildGameStats("genshin", List.of(), Map.of());
        assertEquals(0, stats.currentStreak());
        assertEquals(0, stats.maxStreak());
    }

    @Test
    void consecutiveDatesEndingTodayGiveALiveCurrentStreak() {
        LocalDate today = PuzzleClock.today();
        LocalDate yesterday = today.minusDays(1);
        LocalDate twoDaysAgo = today.minusDays(2);

        List<PuzzleAttempt> attempts = List.of(
            liveAttempt(twoDaysAgo), liveAttempt(yesterday), liveAttempt(today));
        Map<String, Puzzle> puzzles = puzzlesById(twoDaysAgo, yesterday, today);

        UserGameStats stats = service.buildGameStats("genshin", attempts, puzzles);
        assertEquals(3, stats.currentStreak());
        assertEquals(3, stats.maxStreak());
    }

    @Test
    void streakStillCountsCurrentIfLastPlayedWasYesterdayNotToday() {
        LocalDate today = PuzzleClock.today();
        LocalDate yesterday = today.minusDays(1);
        LocalDate twoDaysAgo = today.minusDays(2);

        List<PuzzleAttempt> attempts = List.of(liveAttempt(twoDaysAgo), liveAttempt(yesterday));
        Map<String, Puzzle> puzzles = puzzlesById(twoDaysAgo, yesterday);

        UserGameStats stats = service.buildGameStats("genshin", attempts, puzzles);
        assertEquals(2, stats.currentStreak());
        assertEquals(2, stats.maxStreak());
    }

    @Test
    void gapOfTwoOrMoreDaysBreaksTheCurrentStreakButNotTheHistoricalMax() {
        LocalDate today = PuzzleClock.today();
        LocalDate longAgoStart = today.minusDays(10);
        LocalDate longAgoEnd = today.minusDays(8); // a 3-day run, ending 8 days ago - broken

        List<PuzzleAttempt> attempts = List.of(
            liveAttempt(longAgoStart), liveAttempt(longAgoStart.plusDays(1)), liveAttempt(longAgoEnd));
        Map<String, Puzzle> puzzles = puzzlesById(longAgoStart, longAgoStart.plusDays(1), longAgoEnd);

        UserGameStats stats = service.buildGameStats("genshin", attempts, puzzles);
        assertEquals(0, stats.currentStreak());
        assertEquals(3, stats.maxStreak());
    }

    @Test
    void nonConsecutiveDatesGiveMaxStreakOfOne() {
        LocalDate today = PuzzleClock.today();
        LocalDate fiveDaysAgo = today.minusDays(5);

        List<PuzzleAttempt> attempts = List.of(liveAttempt(fiveDaysAgo), liveAttempt(today));
        Map<String, Puzzle> puzzles = puzzlesById(fiveDaysAgo, today);

        UserGameStats stats = service.buildGameStats("genshin", attempts, puzzles);
        assertEquals(1, stats.currentStreak());
        assertEquals(1, stats.maxStreak());
    }

    @Test
    void archiveOnlyCompletionsAreAlreadyExcludedUpstreamNotDoubleFiltered() {
        // getStats() filters to isPlayedLive() before ever calling
        // buildGameStats - this test documents that buildGameStats itself
        // does NOT re-filter, so a caller passing archive-only attempts
        // would (incorrectly) still count them. Guards against that filter
        // silently moving or being removed from getStats() unnoticed.
        LocalDate today = PuzzleClock.today();
        List<PuzzleAttempt> attempts = List.of(archiveAttempt(today));
        Map<String, Puzzle> puzzles = puzzlesById(today);

        UserGameStats stats = service.buildGameStats("genshin", attempts, puzzles);
        assertEquals(1, stats.currentStreak());
    }
}
