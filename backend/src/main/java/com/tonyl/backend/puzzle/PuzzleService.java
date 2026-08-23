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
    // like minAnswersPerCell=2, or a thin category set (Brawl Stars' Daily
    // puzzles measured at a ~42% single-seed failure rate — far from rare
    // noise). Retrying with a few independent seeds turns that into a
    // negligible rate without touching GridGenerator's algorithm or
    // weakening any correctness check — each retry still runs the full
    // per-cell and soft-lock-guard validation. Shared by both Unlimited
    // (fresh random seeds, see generateUnlimitedPuzzle) and Daily (seeds
    // deterministically derived from the date, see generateDailyPuzzle) —
    // same safety net, different seed strategy per each mode's own
    // determinism requirement.
    private static final int SEED_RETRY_COUNT = 5;

    // Last-resort fallback when every retry above fails - almost always a
    // narrow category set (few dimensions left, especially with a thin
    // dimension like release_version or Brawl Stars traits involved) where
    // valid grids exist but are too statistically rare for random sampling
    // to reliably land on. Exhaustively checking every combination
    // guarantees finding one if it exists, so a player never sees
    // "generation failed" for a category set that does have a valid
    // puzzle - only for one that truly doesn't.
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
        return getOrCreateForDate(gameId, PuzzleClock.today());
    }

    // Same lookup-or-generate shape as getOrCreateTodaysPuzzle, generalized
    // to any date - used for Archived puzzles (see PuzzleController's
    // /archive endpoint, which enforces the 30-day window; this method
    // itself has no date restriction, since generateAndSave/GridGenerator's
    // date-seeded generation is a pure, deterministic function of the date
    // regardless of how far in the past it is). Daily and Archive access to
    // the same date therefore always resolve to the exact same Puzzle row.
    public Puzzle getOrCreateForDate(String gameId, LocalDate date) {
        Optional<Puzzle> existing = puzzleRepository.findByGameIdAndPuzzleDateAndMode(gameId, date, PuzzleMode.DAILY);
        if (existing.isPresent()) {
            return existing.get();
        }
        return generateAndSave(gameId, date);
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
        for (int attempt = 0; attempt < SEED_RETRY_COUNT && generated.isEmpty(); attempt++) {
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
            PuzzleClock.today(),
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

        GridGenerator.GeneratedPuzzle generated = generateDailyPuzzle(gameId, entities, categories, date);

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

    // Same retry + exhaustive-fallback safety net as generateUnlimitedPuzzle
    // above (see SEED_RETRY_COUNT/EXHAUSTIVE_FALLBACK_* for why a single seed
    // isn't enough on its own - measured at a ~42% failure rate for Brawl
    // Stars' thinner category set), but every seed here is derived from
    // `date` alone rather than real randomness. Daily's core guarantee is
    // that the same date always produces the same puzzle for everyone,
    // forever - closing the single-seed failure gap can never come at the
    // cost of that determinism, so nothing in this method reads the clock or
    // a random source.
    // Package-private (not private) so PuzzleServiceGenerationTest can drive
    // it directly with real entity data - it's a pure function of its
    // arguments (no repository/DB access), so it needs no Spring wiring to
    // test.
    GridGenerator.GeneratedPuzzle generateDailyPuzzle(
        String gameId, List<GridItem> entities, List<CategoryDefinition> categories, LocalDate date
    ) {
        long baseSeed = date.toEpochDay();
        Optional<GridGenerator.GeneratedPuzzle> generated = Optional.empty();
        for (int attempt = 0; attempt < SEED_RETRY_COUNT && generated.isEmpty(); attempt++) {
            // Each retry needs a seed well clear of the base seed (and of
            // nearby dates' own base seeds, which only differ by 1) - 104729
            // is just a largeish prime used purely as a spacing constant, not
            // a hash of anything meaningful.
            long seed = baseSeed + attempt * 104_729L;
            generated = gridGenerator.generate(entities, categories, seed, 1, true);
        }

        if (generated.isEmpty()) {
            List<GridGenerator.GeneratedPuzzle> exhaustive = gridGenerator.findAllValidGrids(
                entities, categories, 1, true,
                EXHAUSTIVE_FALLBACK_MAX_CANDIDATES, EXHAUSTIVE_FALLBACK_COMBO_BUDGET);
            if (!exhaustive.isEmpty()) {
                // Deterministic tie-break among multiple valid grids, same
                // reasoning as the seeds above - Math.floorMod (not %) so a
                // negative epoch day (a date before 1970) still lands in
                // range instead of going negative.
                int index = Math.floorMod(date.toEpochDay(), exhaustive.size());
                generated = Optional.of(exhaustive.get(index));
            }
        }

        return generated.orElseThrow(() -> new IllegalStateException(
            "Could not generate a valid puzzle for " + gameId + " on " + date));
    }

    private List<CategorySnapshot> toSnapshots(List<CategoryDefinition> categories) {
        return categories.stream()
            .map(c -> new CategorySnapshot(c.getId(), c.getLabel()))
            .toList();
    }
}