package com.tonyl.backend.puzzle;

import com.tonyl.backend.auth.ForbiddenException;
import com.tonyl.backend.domain.CategorySnapshot;
import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.domain.PuzzleMode;
import com.tonyl.backend.domain.User;
import com.tonyl.backend.auth.SessionOwnership;
import com.tonyl.backend.game.GameModuleRegistry;
import com.tonyl.backend.repository.GridItemRepository;
import com.tonyl.backend.repository.PuzzleGuessCountRepository;
import com.tonyl.backend.repository.PuzzleRepository;
import com.tonyl.backend.repository.UserRepository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Proves POST /puzzle/{id}/guess can no longer be brute-forced past a
// puzzle's guess budget by calling it directly (bypassing the frontend's own
// client-side guessesUsed count) - the actual gap this test suite exists to
// close. Needs real persistence (the atomic upsert PuzzleGuessCountRepository.
// tryConsumeGuess relies on, and Puzzle's JSONB cellSolutions column), same
// rationale as AdminPuzzleServiceRoundTripTest for why this isn't a plain
// JUnit test.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PuzzleServiceGuessLimitTest {

    @Autowired
    private PuzzleRepository puzzleRepository;

    @Autowired
    private GridItemRepository gridItemRepository;

    @Autowired
    private PuzzleGuessCountRepository puzzleGuessCountRepository;

    @Autowired
    private UserRepository userRepository;

    private PuzzleService newService() {
        return new PuzzleService(gridItemRepository, puzzleRepository, puzzleGuessCountRepository,
            new GameModuleRegistry(), new SessionOwnership());
    }

    private Puzzle savePuzzle(String id, PuzzleMode mode, Integer guessLimit) {
        List<CategorySnapshot> rows = List.of(new CategorySnapshot("element:Pyro", "Pyro"));
        List<CategorySnapshot> cols = List.of(new CategorySnapshot("rarity:5", "5-star"));
        Map<String, List<String>> cells = Map.of("0-0", List.of("known-item"));
        Puzzle puzzle = new Puzzle(id, "genshin", LocalDate.of(2099, 1, 1), mode, guessLimit, rows, cols, cells);
        return puzzleRepository.save(puzzle);
    }

    @Test
    void dailyModeRejectsTheTenthGuessRegardlessOfCorrectness() {
        Puzzle puzzle = savePuzzle("guess-limit-daily", PuzzleMode.DAILY, null);
        PuzzleService service = newService();
        String sessionId = "anon-session-a";

        // Every one of the fixed 9 guesses is allowed - right or wrong,
        // mirroring the frontend's own "every submission counts" rule
        // (usePuzzleGuesses's guessLimit doc comment).
        for (int i = 0; i < 9; i++) {
            String itemId = i == 0 ? "known-item" : "wrong-item-" + i;
            service.checkGuess(puzzle.getId(), 0, 0, itemId, sessionId, Optional.empty());
        }

        assertThrows(IllegalStateException.class,
            () -> service.checkGuess(puzzle.getId(), 0, 0, "wrong-item-10", sessionId, Optional.empty()),
            "a 10th guess must be rejected even though the puzzle's answer key would still evaluate it");
    }

    @Test
    void dailyModeTracksGuessBudgetsSeparatelyPerSession() {
        Puzzle puzzle = savePuzzle("guess-limit-daily-per-session", PuzzleMode.DAILY, null);
        PuzzleService service = newService();

        for (int i = 0; i < 9; i++) {
            service.checkGuess(puzzle.getId(), 0, 0, "wrong-" + i, "session-x", Optional.empty());
        }
        assertThrows(IllegalStateException.class,
            () -> service.checkGuess(puzzle.getId(), 0, 0, "wrong-10", "session-x", Optional.empty()));

        // A different session's budget for the same puzzle is untouched.
        var result = service.checkGuess(puzzle.getId(), 0, 0, "known-item", "session-y", Optional.empty());
        assertTrue(result.correct());
    }

    @Test
    void unlimitedModeWithNullGuessLimitNeverRejects() {
        Puzzle puzzle = savePuzzle("guess-limit-unlimited-uncapped", PuzzleMode.UNLIMITED, null);
        PuzzleService service = newService();

        for (int i = 0; i < 20; i++) {
            service.checkGuess(puzzle.getId(), 0, 0, "wrong-" + i, "session-z", Optional.empty());
        }
        // No exception across 20 guesses against a fixed 9-guess-genre-value
        // proves this puzzle's null guessLimit is genuinely unlimited, not
        // silently defaulted to the DAILY constant.
        assertTrue(puzzleGuessCountRepository.findAll().stream()
            .noneMatch(row -> row.getPuzzleId().equals(puzzle.getId())),
            "an unlimited puzzle should never write a guess-count row at all");
    }

    @Test
    void unlimitedModeWithAnExplicitCapEnforcesItLikeDaily() {
        Puzzle puzzle = savePuzzle("guess-limit-unlimited-capped", PuzzleMode.UNLIMITED, 9);
        PuzzleService service = newService();

        for (int i = 0; i < 9; i++) {
            service.checkGuess(puzzle.getId(), 0, 0, "wrong-" + i, "session-w", Optional.empty());
        }
        assertThrows(IllegalStateException.class,
            () -> service.checkGuess(puzzle.getId(), 0, 0, "wrong-10", "session-w", Optional.empty()));
    }

    @Test
    void aGuessLimitedPuzzleRequiresASessionId() {
        Puzzle puzzle = savePuzzle("guess-limit-requires-session", PuzzleMode.DAILY, null);
        PuzzleService service = newService();

        assertThrows(IllegalArgumentException.class,
            () -> service.checkGuess(puzzle.getId(), 0, 0, "known-item", null, Optional.empty()));
        assertThrows(IllegalArgumentException.class,
            () -> service.checkGuess(puzzle.getId(), 0, 0, "known-item", "  ", Optional.empty()));
    }

    @Test
    void aForgedUserSessionIdIsRejectedBeforeSpendingAGuess() {
        Puzzle puzzle = savePuzzle("guess-limit-forged-session", PuzzleMode.DAILY, null);
        PuzzleService service = newService();

        assertThrows(ForbiddenException.class,
            () -> service.checkGuess(puzzle.getId(), 0, 0, "known-item", "user:999", Optional.empty()));

        // The rejected attempt above must not have consumed any of this
        // forged sessionId's guess budget - proves the ownership check runs
        // before the atomic increment, not after.
        assertFalse(puzzleGuessCountRepository.findAll().stream()
            .anyMatch(row -> row.getPuzzleId().equals(puzzle.getId()) && row.getSessionId().equals("user:999")));
    }

    @Test
    void aMatchingUserSessionIdIsAcceptedAndSpendsThatUsersOwnBudget() {
        Puzzle puzzle = savePuzzle("guess-limit-real-user-session", PuzzleMode.DAILY, null);
        PuzzleService service = newService();
        User user = userRepository.save(
            new User("google-sub-guess-limit-test", "player@example.com", "Player", null, java.time.Instant.now()));
        String sessionId = "user:" + user.getId();

        var result = service.checkGuess(puzzle.getId(), 0, 0, "known-item", sessionId, Optional.of(user));
        assertTrue(result.correct());

        boolean tracked = puzzleGuessCountRepository.findAll().stream()
            .anyMatch(row -> row.getPuzzleId().equals(puzzle.getId())
                && row.getSessionId().equals(sessionId) && row.getGuessesUsed() == 1);
        assertTrue(tracked, "the real user's own guess should be counted against their own sessionId");
    }
}
