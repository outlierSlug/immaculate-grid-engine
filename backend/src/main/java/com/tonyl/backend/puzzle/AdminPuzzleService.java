package com.tonyl.backend.puzzle;

import com.tonyl.backend.api.AdminPuzzleHistoryResponse;
import com.tonyl.backend.api.PinPuzzleRequest;
import com.tonyl.backend.api.PuzzleStatsResponse;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

// Admin-only puzzle curation: browsing several generated candidates for a
// future date and pinning one, rather than letting on-demand generation
// silently decide. Kept separate from PuzzleService, which already
// documents two distinct, carefully-separated seed philosophies (Daily's
// date-derived determinism vs. Unlimited's per-request randomness) - this
// is a third (random seed, several candidates at once, future-dated,
// admin-only) that would only muddy that existing documentation if folded
// in. Same constructor-injected dependencies PuzzleService already has.
@Service
public class AdminPuzzleService {

    private static final int MAX_CANDIDATES = 20;
    private static final int GRID_SIZE = 3;
    private static final Set<String> REQUIRED_CELL_KEYS = Set.of(
        "0-0", "0-1", "0-2", "1-0", "1-1", "1-2", "2-0", "2-1", "2-2"
    );

    // Return shape for evaluateGrid: no candidate search happened, so unlike
    // GridGenerator.GeneratedPuzzle there's no need for a List<GeneratedPuzzle>
    // - this is the direct, single evaluation of the exact ids the admin
    // picked, plus whether a full 9-cell assignment exists for it.
    public record EvaluatedGrid(
        List<CategoryDefinition> rowCategories,
        List<CategoryDefinition> colCategories,
        Map<String, List<String>> cellSolutions,
        boolean solvable
    ) {}

    private final GridItemRepository gridItemRepository;
    private final PuzzleRepository puzzleRepository;
    private final GameModuleRegistry gameModuleRegistry;
    private final PuzzleStatsService puzzleStatsService;
    private final PuzzleService puzzleService;
    private final GridGenerator gridGenerator = new GridGenerator();

    public AdminPuzzleService(GridItemRepository gridItemRepository, PuzzleRepository puzzleRepository,
                               GameModuleRegistry gameModuleRegistry, PuzzleStatsService puzzleStatsService,
                               PuzzleService puzzleService) {
        this.gridItemRepository = gridItemRepository;
        this.puzzleRepository = puzzleRepository;
        this.gameModuleRegistry = gameModuleRegistry;
        this.puzzleStatsService = puzzleStatsService;
        this.puzzleService = puzzleService;
    }

    // Random seed (ThreadLocalRandom, not date.toEpochDay()) - that seed is
    // reserved for the real auto-generation fallback's "same date always
    // produces the same puzzle forever" guarantee. Using it here would mean
    // re-querying candidates for the same future date always returns the
    // exact same set, making "reroll for more options" impossible.
    public List<GridGenerator.GeneratedPuzzle> generateCandidates(
            String gameId, LocalDate date, int count, int minAnswersPerCell) {
        if (!date.isAfter(PuzzleClock.today())) {
            throw new IllegalArgumentException("date must be strictly after today");
        }
        if (count < 1 || count > MAX_CANDIDATES) {
            throw new IllegalArgumentException("count must be between 1 and " + MAX_CANDIDATES);
        }
        List<GridItem> entities = gridItemRepository.findByGameId(gameId);
        GameModule module = gameModuleRegistry.resolve(gameId); // 400 on unknown gameId, for free
        List<CategoryDefinition> categories = module.getCategoryDefinitions(entities);
        long seed = ThreadLocalRandom.current().nextLong();
        return gridGenerator.generateCandidates(entities, categories, seed, minAnswersPerCell, true, count);
    }

    // Immutability enforced by the same PuzzleClock.today() check used
    // everywhere else - once today catches up to a pinned date, further
    // edits are rejected automatically, no separate "has this been played"
    // flag needed. Upserts on the deterministic Daily id, so re-pinning the
    // same future date freely overwrites whatever was there before.
    public Puzzle pinFuturePuzzle(String gameId, LocalDate date, PinPuzzleRequest request) {
        gameModuleRegistry.resolve(gameId); // validates gameId
        if (!date.isAfter(PuzzleClock.today())) {
            throw new IllegalArgumentException("date must be strictly after today - a live/past date is immutable");
        }
        validateShape(request);
        // Both the generate/evaluate flows only ever source cellSolutions ids
        // from a real gridItemRepository match, so this is normally a no-op -
        // but /pin takes the raw request body, and nothing else stops a
        // hand-crafted or buggy POST from submitting ids that don't exist (or
        // belong to a different game). Fetched once here (not inside
        // buildPinnedPuzzle) so that method can stay a pure function of its
        // arguments - see its own doc comment.
        Set<String> validItemIds = gridItemRepository.findByGameId(gameId).stream()
            .map(GridItem::getId)
            .collect(Collectors.toSet());
        Puzzle puzzle = buildPinnedPuzzle(gameId, date, request, validItemIds);
        return puzzleRepository.save(puzzle);
    }

    // Package-private, pure function of its arguments (no repository/DB
    // access) - same convention as evaluateGrid's own GameModule/
    // List<GridItem> overload, so AdminPuzzleServiceTest can exercise the
    // unknown-item-id and unsolvable-assignment rejections directly with
    // hand-built fixtures, no GridItemRepository/DB needed. Assumes
    // validateShape has already passed (only pinFuturePuzzle calls this).
    Puzzle buildPinnedPuzzle(String gameId, LocalDate date, PinPuzzleRequest request, Set<String> validItemIds) {
        validateItemIds(request.cellSolutions(), validItemIds);
        // Unconditional on every pin, generated or manual - see the class-level
        // doc on why there's no "trusted, generated" vs. "must-check, manual"
        // distinction at the API level. Free (always true) for a candidate
        // that came out of generateCandidates; the real gate for a hand-built
        // grid, where every cell individually having >=1 answer doesn't mean a
        // full 9-distinct-character assignment exists.
        if (!gridGenerator.hasPerfectMatching(request.cellSolutions())) {
            throw new IllegalArgumentException(
                "This combination has no valid full 9-cell assignment: some cells only have answers that "
                + "are also the only option for another cell, so there's no way to fill all 9 cells with 9 "
                + "distinct characters at once. Swap one of the categories involved for one with more "
                + "independent answers, or widen a cell's answer pool.");
        }
        return new Puzzle(gameId + ":" + date, gameId, date, PuzzleMode.DAILY, null,
            request.rowCategories(), request.colCategories(), request.cellSolutions());
    }

    // Read-only preview of what's currently set for a future date, before
    // deciding to regenerate/pin - restricted to date.isAfter(today), the
    // same bound pinFuturePuzzle itself enforces, so this can never silently
    // fabricate a puzzle for a genuinely past date the way calling
    // puzzleService.getOrCreateForDate directly (with no guard) could. Today
    // or earlier has its own read path (getHistory) with its own,
    // deliberately different rules.
    public Puzzle getPinnedPreview(String gameId, LocalDate date) {
        gameModuleRegistry.resolve(gameId); // validates gameId
        if (!date.isAfter(PuzzleClock.today())) {
            throw new IllegalArgumentException(
                "date must be strictly after today - use the History tab to view today or earlier");
        }
        return puzzleService.getOrCreateForDate(gameId, date);
    }

    // Read-only lookup for today or any past date, for the admin History tab.
    // For a genuinely past date, deliberately NOT PuzzleService.getOrCreateForDate
    // - that would silently fabricate and PERSIST a brand-new puzzle for a
    // date that may never have actually run (before this feature existed, or
    // any other gap), corrupting the historical record this view exists to
    // show truthfully; a date with no real puzzle row surfaces as 404, not
    // an auto-generated stand-in. Today is the one exception: it IS the live
    // Daily puzzle, the same row getOrCreateForDate would create for the
    // first real visitor regardless of whether this admin view happens to
    // ask for it first - not a fabrication, just triggering the same real
    // generation a moment earlier. Editing is never possible here either
    // way, this is strictly a read.
    public AdminPuzzleHistoryResponse getHistory(String gameId, LocalDate date) {
        gameModuleRegistry.resolve(gameId); // validates gameId
        LocalDate today = PuzzleClock.today();
        if (date.isAfter(today)) {
            throw new IllegalArgumentException("date must be today or earlier");
        }
        String puzzleId = gameId + ":" + date;
        Puzzle puzzle = date.isEqual(today)
            ? puzzleService.getOrCreateForDate(gameId, date)
            : puzzleRepository.findById(puzzleId)
                .orElseThrow(() -> new NoSuchElementException("No puzzle was ever generated for " + puzzleId));
        PuzzleStatsResponse stats = puzzleStatsService.getStatsForAdmin(puzzleId);
        return AdminPuzzleHistoryResponse.from(puzzle, stats);
    }

    // Read-only "what would this exact combination produce" preview for the
    // manual puzzle builder - no candidate search, no randomness, just
    // direct per-cell predicate evaluation of the admin-chosen categories
    // (exactly what GridGenerator's inner loop does, minus the minAnswersPerCell
    // floor: an empty cell here just shows 0/empty, it doesn't fail the call -
    // only pinFuturePuzzle is the hard gate).
    public EvaluatedGrid evaluateGrid(String gameId, List<String> rowCategoryIds, List<String> colCategoryIds) {
        GameModule module = gameModuleRegistry.resolve(gameId); // 400 on unknown gameId, for free
        List<GridItem> entities = gridItemRepository.findByGameId(gameId);
        return evaluateGrid(module, entities, rowCategoryIds, colCategoryIds);
    }

    // Package-private overload so AdminPuzzleServiceTest can drive it
    // directly with real entity data - same convention as
    // PuzzleService.generateDailyPuzzle: it's a pure function of its
    // arguments (no repository/DB access), so it needs no Spring wiring to
    // test.
    EvaluatedGrid evaluateGrid(GameModule module, List<GridItem> entities,
                               List<String> rowCategoryIds, List<String> colCategoryIds) {
        List<CategoryDefinition> categories = module.getCategoryDefinitions(entities);
        Map<String, CategoryDefinition> categoriesById = categories.stream()
            .collect(Collectors.toMap(CategoryDefinition::getId, c -> c));

        List<CategoryDefinition> rows = requireCategories(categoriesById, rowCategoryIds);
        List<CategoryDefinition> cols = requireCategories(categoriesById, colCategoryIds);

        if (rows.size() != GRID_SIZE || cols.size() != GRID_SIZE) {
            throw new IllegalArgumentException(
                "rowCategoryIds and colCategoryIds must each have exactly " + GRID_SIZE + " entries");
        }

        Map<String, List<String>> cellSolutions = new LinkedHashMap<>();
        for (int r = 0; r < GRID_SIZE; r++) {
            for (int c = 0; c < GRID_SIZE; c++) {
                CategoryDefinition rowCat = rows.get(r);
                CategoryDefinition colCat = cols.get(c);
                List<String> matches = entities.stream()
                    .filter(e -> rowCat.matches(e) && colCat.matches(e))
                    .map(GridItem::getId)
                    .toList();
                cellSolutions.put(r + "-" + c, matches);
            }
        }

        // No minAnswersPerCell floor here - an empty cell correctly makes
        // hasPerfectMatching evaluate false below, which is exactly what
        // should surface to the admin as "not solvable" rather than being
        // rejected outright.
        boolean solvable = gridGenerator.hasPerfectMatching(cellSolutions);
        return new EvaluatedGrid(rows, cols, cellSolutions, solvable);
    }

    private static List<CategoryDefinition> requireCategories(
            Map<String, CategoryDefinition> categoriesById, List<String> ids) {
        if (ids == null) {
            throw new IllegalArgumentException("rowCategoryIds and colCategoryIds must each have exactly "
                + GRID_SIZE + " entries");
        }
        return ids.stream().map(id -> {
            CategoryDefinition category = categoriesById.get(id);
            if (category == null) {
                throw new IllegalArgumentException("Unknown category id for this game: " + id);
            }
            return category;
        }).toList();
    }

    private void validateShape(PinPuzzleRequest request) {
        if (request.rowCategories() == null || request.rowCategories().size() != 3
                || request.colCategories() == null || request.colCategories().size() != 3) {
            throw new IllegalArgumentException("rowCategories and colCategories must each have exactly 3 entries");
        }
        Map<String, List<String>> cellSolutions = request.cellSolutions();
        if (cellSolutions == null || !cellSolutions.keySet().equals(REQUIRED_CELL_KEYS)) {
            throw new IllegalArgumentException("cellSolutions must have exactly the 9 keys \"0-0\" through \"2-2\"");
        }
        for (List<String> answers : cellSolutions.values()) {
            if (answers == null || answers.isEmpty()) {
                throw new IllegalArgumentException("every cellSolutions entry must have at least one answer");
            }
        }
    }

    // Structural validity (validateShape) and a distinct full assignment
    // existing (hasPerfectMatching) both say nothing about whether the ids
    // themselves are real - a request could satisfy both with ids that don't
    // exist, or belong to a different game.
    private void validateItemIds(Map<String, List<String>> cellSolutions, Set<String> validItemIds) {
        for (List<String> answers : cellSolutions.values()) {
            for (String itemId : answers) {
                if (!validItemIds.contains(itemId)) {
                    throw new IllegalArgumentException("Unknown item id: " + itemId);
                }
            }
        }
    }
}
