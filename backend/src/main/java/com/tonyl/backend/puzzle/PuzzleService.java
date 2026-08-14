package com.tonyl.backend.puzzle;

import com.tonyl.backend.api.UnlimitedPuzzleRequest;
import com.tonyl.backend.domain.CategorySnapshot;
import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.domain.PuzzleMode;
import com.tonyl.backend.game.CategoryDefinition;
import com.tonyl.backend.game.GameModule;
import com.tonyl.backend.game.GameModuleRegistry;
import com.tonyl.backend.repository.GridItemRepository;
import com.tonyl.backend.repository.PuzzleRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class PuzzleService {

    // A single seed's bounded (500-attempt) search can legitimately come up
    // empty even when valid puzzles exist — especially under stricter filters
    // like minAnswersPerCell=2, which shrink the valid-combination space
    // enough that this was measured at a ~14% single-seed failure rate, not
    // rare noise. Retrying with a few independent fresh seeds turns that into
    // a negligible rate without touching GridGenerator's algorithm or
    // weakening any correctness check — each retry still runs the full
    // per-cell and soft-lock-guard validation.
    private static final int UNLIMITED_SEED_RETRY_COUNT = 5;

    // Last-resort fallback when every randomized retry above fails - almost
    // always a narrow Unlimited-mode filter (few dimensions left, especially
    // with a thin dimension like release_version involved) where valid grids
    // exist but are too statistically rare for random sampling to reliably
    // land on. Exhaustively checking every combination guarantees finding one
    // if it exists, so a player never sees "generation failed" for filters
    // that do have a valid puzzle - only for filters where one truly doesn't.
    private static final int EXHAUSTIVE_FALLBACK_MAX_CANDIDATES = 50;
    private static final long EXHAUSTIVE_FALLBACK_COMBO_BUDGET = 6_000_000L;

    private final GridItemRepository gridItemRepository;
    private final PuzzleRepository puzzleRepository;
    private final GameModuleRegistry gameModuleRegistry;
    private final GridGenerator gridGenerator = new GridGenerator();

    public PuzzleService(GridItemRepository gridItemRepository, PuzzleRepository puzzleRepository,
                          GameModuleRegistry gameModuleRegistry) {
        this.gridItemRepository = gridItemRepository;
        this.puzzleRepository = puzzleRepository;
        this.gameModuleRegistry = gameModuleRegistry;
    }

    public Puzzle getOrCreateTodaysPuzzle(String gameId) {
        LocalDate today = LocalDate.now();

        Optional<Puzzle> existing = puzzleRepository.findByGameIdAndPuzzleDateAndMode(gameId, today, PuzzleMode.DAILY);
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

    public Puzzle generateUnlimitedPuzzle(String gameId, UnlimitedPuzzleRequest request) {
        List<GridItem> entities = gridItemRepository.findByGameId(gameId);
        GameModule module = gameModuleRegistry.resolve(gameId);
        List<CategoryDefinition> categories = filterCategories(module.getCategoryDefinitions(entities), request);

        long distinctDimensions = categories.stream().map(CategoryDefinition::getDimension).distinct().count();
        if (distinctDimensions < 2) {
            throw new IllegalArgumentException(
                "At least 2 category dimensions must remain after filtering to generate a puzzle");
        }

        int minAnswersPerCell = request.minAnswersPerCell() != null ? request.minAnswersPerCell() : 1;
        boolean requireSoftLockGuard = request.requireSoftLockGuard() == null || request.requireSoftLockGuard();

        Optional<GridGenerator.GeneratedPuzzle> generated = Optional.empty();
        for (int attempt = 0; attempt < UNLIMITED_SEED_RETRY_COUNT && generated.isEmpty(); attempt++) {
            long seed = ThreadLocalRandom.current().nextLong();
            generated = gridGenerator.generate(entities, categories, seed, minAnswersPerCell, requireSoftLockGuard);
        }

        GridGenerator.GeneratedPuzzle result = generated.orElse(null);
        if (result == null) {
            List<GridGenerator.GeneratedPuzzle> exhaustive = gridGenerator.findAllValidGrids(
                entities, categories, minAnswersPerCell, requireSoftLockGuard,
                EXHAUSTIVE_FALLBACK_MAX_CANDIDATES, EXHAUSTIVE_FALLBACK_COMBO_BUDGET);
            if (!exhaustive.isEmpty()) {
                result = exhaustive.get(ThreadLocalRandom.current().nextInt(exhaustive.size()));
            }
        }

        if (result == null) {
            throw new IllegalStateException(
                "Could not generate a valid unlimited puzzle for " + gameId + " with the selected filters");
        }

        Puzzle puzzle = new Puzzle(
            gameId + ":unlimited:" + UUID.randomUUID(),
            gameId,
            LocalDate.now(),
            PuzzleMode.UNLIMITED,
            toSnapshots(result.rowCategories()),
            toSnapshots(result.colCategories()),
            result.cellSolutions()
        );
        return puzzleRepository.save(puzzle);
    }

    private List<CategoryDefinition> filterCategories(List<CategoryDefinition> categories, UnlimitedPuzzleRequest request) {
        List<String> allowedDimensions = request.dimensions();
        Set<String> excludedIds = request.excludedCategoryIds() != null
            ? new HashSet<>(request.excludedCategoryIds())
            : Set.of();

        return categories.stream()
            .filter(c -> allowedDimensions == null || allowedDimensions.isEmpty()
                || allowedDimensions.contains(c.getDimension()))
            .filter(c -> !excludedIds.contains(c.getId()))
            .toList();
    }

    private Puzzle generateAndSave(String gameId, LocalDate date) {
        List<GridItem> entities = gridItemRepository.findByGameId(gameId);
        GameModule module = gameModuleRegistry.resolve(gameId);
        List<CategoryDefinition> categories = module.getCategoryDefinitions(entities);

        GridGenerator.GeneratedPuzzle generated = gridGenerator.generate(entities, categories, date)
            .orElseThrow(() -> new IllegalStateException(
                "Could not generate a valid puzzle for " + gameId + " on " + date));

        Puzzle puzzle = new Puzzle(
            gameId + ":" + date,
            gameId,
            date,
            PuzzleMode.DAILY,
            toSnapshots(generated.rowCategories()),
            toSnapshots(generated.colCategories()),
            generated.cellSolutions()
        );
        return puzzleRepository.save(puzzle);
    }

    private List<CategorySnapshot> toSnapshots(List<CategoryDefinition> categories) {
        return categories.stream()
            .map(c -> new CategorySnapshot(c.getId(), c.getLabel()))
            .toList();
    }
}