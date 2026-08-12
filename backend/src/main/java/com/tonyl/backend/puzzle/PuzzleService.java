package com.tonyl.backend.puzzle;

import com.tonyl.backend.domain.CategorySnapshot;
import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.game.BrawlStarsGameModule;
import com.tonyl.backend.game.CategoryDefinition;
import com.tonyl.backend.game.GameModule;
import com.tonyl.backend.game.GenshinGameModule;
import com.tonyl.backend.repository.GridItemRepository;
import com.tonyl.backend.repository.PuzzleRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
public class PuzzleService {

    private final GridItemRepository gridItemRepository;
    private final PuzzleRepository puzzleRepository;
    private final GridGenerator gridGenerator = new GridGenerator();

    public PuzzleService(GridItemRepository gridItemRepository, PuzzleRepository puzzleRepository) {
        this.gridItemRepository = gridItemRepository;
        this.puzzleRepository = puzzleRepository;
    }

    public Puzzle getOrCreateTodaysPuzzle(String gameId) {
        LocalDate today = LocalDate.now();

        Optional<Puzzle> existing = puzzleRepository.findByGameIdAndPuzzleDate(gameId, today);
        if (existing.isPresent()) {
            return existing.get();
        }
        return generateAndSave(gameId, today);
    }
    
    public GuessResult checkGuess(String puzzleId, int row, int col, String itemId) {
        Puzzle puzzle = puzzleRepository.findById(puzzleId)
            .orElseThrow(() -> new NoSuchElementException("No puzzle found with id " + puzzleId));

        String cellKey = row + "-" + col;
        List<String> validAnswers = puzzle.getCellSolutions().get(cellKey);
        if (validAnswers == null) {
            throw new IllegalArgumentException("Invalid cell position: " + cellKey);
        }

        String normalizedItemId = itemId.toLowerCase();
        boolean correct = validAnswers.contains(normalizedItemId);

        GridItem item = gridItemRepository.findById(normalizedItemId).orElse(null);

        return new GuessResult(
            correct,
            normalizedItemId,
            item != null ? item.getDisplayName() : normalizedItemId,
            item != null ? item.getImageUrl() : null
        );
    }

    public record GuessResult(boolean correct, String itemId, String displayName, String imageUrl) {}

    private Puzzle generateAndSave(String gameId, LocalDate date) {
        List<GridItem> entities = gridItemRepository.findByGameId(gameId);
        GameModule module = resolveModule(gameId);
        List<CategoryDefinition> categories = module.getCategoryDefinitions(entities);

        GridGenerator.GeneratedPuzzle generated = gridGenerator.generate(entities, categories, date)
            .orElseThrow(() -> new IllegalStateException(
                "Could not generate a valid puzzle for " + gameId + " on " + date));

        Puzzle puzzle = new Puzzle(
            gameId + ":" + date,
            gameId,
            date,
            toSnapshots(generated.rowCategories()),
            toSnapshots(generated.colCategories()),
            generated.cellSolutions()
        );
        return puzzleRepository.save(puzzle);
    }

    private GameModule resolveModule(String gameId) {
        // TODO: replace with a proper registry once a second GameModule exists (Phase 2)
        return switch (gameId) {
            case "genshin" -> new GenshinGameModule();
            case "brawlstars" -> new BrawlStarsGameModule();
            default -> throw new IllegalArgumentException("Unknown gameId: " + gameId);
        };
    }

    private List<CategorySnapshot> toSnapshots(List<CategoryDefinition> categories) {
        return categories.stream()
            .map(c -> new CategorySnapshot(c.getId(), c.getLabel()))
            .toList();
    }
}