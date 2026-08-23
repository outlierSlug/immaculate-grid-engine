package com.tonyl.backend.puzzle;

import com.tonyl.backend.api.CompletedDateInfo;
import com.tonyl.backend.api.UserGameStats;
import com.tonyl.backend.api.UserPuzzleSummary;
import com.tonyl.backend.api.UserStatsResponse;
import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.domain.PuzzleAttempt;
import com.tonyl.backend.domain.User;
import com.tonyl.backend.repository.PuzzleAttemptRepository;
import com.tonyl.backend.repository.PuzzleRepository;

import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

// A signed-in user's own cross-puzzle history, grouped by game - distinct
// from PuzzleStatsService, which is always scoped to a single puzzle's
// community stats. Deliberately does not compute average uniqueness here:
// that formula has exactly one implementation, client-side
// (utils/uniqueness.ts), so this just hands back the raw per-attempt data
// (including cellAnswers) needed to run it per puzzle on the frontend.
@Service
public class UserStatsService {

    // Bounds each game's puzzles list regardless of how long a user has
    // been playing - unlike gamesPlayed/avgScore (cheap all-time aggregates
    // below), this list backs a fan-out of one /stats fetch per puzzle on
    // the frontend, so it needs a cap independent of this project's small
    // user count. Applied per game, not overall.
    private static final int RECENT_PUZZLES_LIMIT = 60;

    private final PuzzleAttemptRepository puzzleAttemptRepository;
    private final PuzzleRepository puzzleRepository;

    public UserStatsService(PuzzleAttemptRepository puzzleAttemptRepository, PuzzleRepository puzzleRepository) {
        this.puzzleAttemptRepository = puzzleAttemptRepository;
        this.puzzleRepository = puzzleRepository;
    }

    public UserStatsResponse getStats(User user) {
        String sessionId = "user:" + user.getId();
        // Personal aggregate deliberately excludes archived-puzzle
        // completions - "games played" should reflect genuine daily
        // engagement, not something inflatable by binge-playing archives in
        // one sitting. This is unrelated to (and doesn't change) the
        // community-level per-puzzle stats in PuzzleStatsService, which
        // count every attempt regardless of when it was made - confirmed
        // that's the correct, intended behavior there.
        List<PuzzleAttempt> attempts = puzzleAttemptRepository.findBySessionId(sessionId).stream()
            .filter(PuzzleAttempt::isPlayedLive)
            .toList();

        if (attempts.isEmpty()) {
            return new UserStatsResponse(List.of());
        }

        // Every referenced puzzle, not just a capped subset - gameId
        // grouping and the true all-time per-game gamesPlayed/avgScore both
        // need the full set, only the per-game *puzzles list* gets capped.
        Map<String, Puzzle> puzzlesById = puzzleRepository.findAllById(
                attempts.stream().map(PuzzleAttempt::getPuzzleId).distinct().toList())
            .stream()
            .collect(Collectors.toMap(Puzzle::getId, Function.identity()));

        Map<String, List<PuzzleAttempt>> attemptsByGame = attempts.stream()
            .filter(a -> puzzlesById.containsKey(a.getPuzzleId()))
            .collect(Collectors.groupingBy(a -> puzzlesById.get(a.getPuzzleId()).getGameId()));

        List<UserGameStats> games = attemptsByGame.entrySet().stream()
            .map(entry -> buildGameStats(entry.getKey(), entry.getValue(), puzzlesById))
            .sorted(Comparator.comparing(UserGameStats::gameId))
            .toList();

        return new UserStatsResponse(games);
    }

    // Distinct from getStats above on purpose: "have I completed this
    // puzzle at all" (used to mark dates as done in the Archive list) is a
    // different question from "does it count toward my career stats/streak"
    // - this one is NOT filtered by playedLive, since completing something
    // via Archive is still completing it, even though it doesn't inflate
    // the engagement-signal aggregate.
    public List<CompletedDateInfo> getCompletedDates(User user, String gameId) {
        String sessionId = "user:" + user.getId();
        List<PuzzleAttempt> attempts = puzzleAttemptRepository.findBySessionId(sessionId);
        if (attempts.isEmpty()) {
            return List.of();
        }

        Map<String, Puzzle> puzzlesById = puzzleRepository.findAllById(
                attempts.stream().map(PuzzleAttempt::getPuzzleId).distinct().toList())
            .stream()
            .collect(Collectors.toMap(Puzzle::getId, Function.identity()));

        // One attempt per (puzzleId, sessionId) is already enforced by a DB
        // unique constraint, and puzzleId encodes (gameId, date) for DAILY
        // mode - so each date maps to at most one attempt, one playedLive
        // value, no ambiguity to resolve here.
        return attempts.stream()
            .filter(a -> puzzlesById.containsKey(a.getPuzzleId()) && puzzlesById.get(a.getPuzzleId()).getGameId().equals(gameId))
            .map(a -> new CompletedDateInfo(
                puzzlesById.get(a.getPuzzleId()).getPuzzleDate().toString(), a.isPlayedLive(), a.getScore()))
            .toList();
    }

    private UserGameStats buildGameStats(String gameId, List<PuzzleAttempt> gameAttempts,
                                          Map<String, Puzzle> puzzlesById) {
        long gamesPlayed = gameAttempts.size();
        double avgScore = gameAttempts.stream().mapToInt(PuzzleAttempt::getScore).average().orElse(0);

        List<UserPuzzleSummary> recent = gameAttempts.stream()
            .sorted(Comparator.comparing(PuzzleAttempt::getCompletedAt).reversed())
            .limit(RECENT_PUZZLES_LIMIT)
            .map(attempt -> {
                Puzzle puzzle = puzzlesById.get(attempt.getPuzzleId());
                return new UserPuzzleSummary(
                    attempt.getPuzzleId(),
                    gameId,
                    puzzle.getPuzzleDate(),
                    attempt.getScore(),
                    attempt.isSolved(),
                    attempt.getCompletedAt(),
                    attempt.getCellAnswers()
                );
            })
            .toList();

        return new UserGameStats(gameId, gamesPlayed, avgScore, recent);
    }
}
