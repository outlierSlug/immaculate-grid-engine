package com.tonyl.backend.puzzle;

import com.tonyl.backend.auth.SessionOwnership;
import com.tonyl.backend.domain.CategorySnapshot;
import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.domain.PuzzleMode;
import com.tonyl.backend.game.GameModuleRegistry;
import com.tonyl.backend.repository.GridItemRepository;
import com.tonyl.backend.repository.PuzzleGuessCountRepository;
import com.tonyl.backend.repository.PuzzleRepository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

// Proves the post-Unlimited-game answer reveal (GET /puzzle/{id}/answers)
// returns the real cellSolutions for an Unlimited puzzle, and - the actual
// gap this test suite exists to close - refuses to do the same for a Daily
// puzzle, which would undermine the community pick-rate data every Daily
// attempt feeds into (see PuzzleService.getUnlimitedAnswers's own doc
// comment). Needs real persistence for the JSONB cellSolutions column, same
// rationale as PuzzleServiceGuessLimitTest.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PuzzleServiceUnlimitedAnswersTest {

    @Autowired
    private PuzzleRepository puzzleRepository;

    @Autowired
    private GridItemRepository gridItemRepository;

    @Autowired
    private PuzzleGuessCountRepository puzzleGuessCountRepository;

    private PuzzleService newService() {
        return new PuzzleService(gridItemRepository, puzzleRepository, puzzleGuessCountRepository,
            new GameModuleRegistry(), new SessionOwnership());
    }

    private Puzzle savePuzzle(String id, PuzzleMode mode) {
        List<CategorySnapshot> rows = List.of(new CategorySnapshot("element:Pyro", "Pyro"));
        List<CategorySnapshot> cols = List.of(new CategorySnapshot("rarity:5", "5-star"));
        Map<String, List<String>> cells = Map.of(
            "0-0", List.of("known-item", "another-item"),
            "0-1", List.of("known-item"));
        Puzzle puzzle = new Puzzle(id, "genshin", LocalDate.of(2099, 1, 1), mode, null, rows, cols, cells);
        return puzzleRepository.save(puzzle);
    }

    @Test
    void returnsTheRealCellSolutionsForAnUnlimitedPuzzle() {
        Puzzle puzzle = savePuzzle("answers-unlimited", PuzzleMode.UNLIMITED);
        PuzzleService service = newService();

        Map<String, List<String>> answers = service.getUnlimitedAnswers(puzzle.getId());

        assertEquals(List.of("known-item", "another-item"), answers.get("0-0"));
        assertEquals(List.of("known-item"), answers.get("0-1"));
    }

    @Test
    void refusesToRevealAnswersForADailyPuzzle() {
        Puzzle puzzle = savePuzzle("answers-daily", PuzzleMode.DAILY);
        PuzzleService service = newService();

        assertThrows(IllegalArgumentException.class, () -> service.getUnlimitedAnswers(puzzle.getId()),
            "revealing a Daily puzzle's answers would undermine the community pick-rate data it still needs to collect");
    }

    @Test
    void aNonexistentPuzzleIdIsRejected() {
        PuzzleService service = newService();

        assertThrows(NoSuchElementException.class, () -> service.getUnlimitedAnswers("genshin:unlimited:does-not-exist"));
    }
}
