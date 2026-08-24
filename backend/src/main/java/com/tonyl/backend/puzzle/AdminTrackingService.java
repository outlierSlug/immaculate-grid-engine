package com.tonyl.backend.puzzle;

import com.tonyl.backend.api.AdminTrackingResponse;
import com.tonyl.backend.api.CategoryAppearance;
import com.tonyl.backend.api.CharacterAppearance;
import com.tonyl.backend.api.DimensionPairing;
import com.tonyl.backend.api.TrackingWindow;
import com.tonyl.backend.domain.CategorySnapshot;
import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.domain.PuzzleMode;
import com.tonyl.backend.game.CategoryDefinition;
import com.tonyl.backend.game.GameModuleRegistry;
import com.tonyl.backend.repository.GridItemRepository;
import com.tonyl.backend.repository.PuzzleRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;

// Plain in-memory Java over already-deserialized Puzzle objects, not raw
// SQL - Puzzle.rowCategories/colCategories/cellSolutions already
// deserialize from JSONB into typed List<CategorySnapshot>/
// Map<String, List<String>> via Hibernate's JsonType mapping, so no manual
// JSON parsing is needed. Mirrors GridGeneratorTest#characterFairnessReport's
// existing Set/Counter-based counting (same "a character counts once per
// puzzle if it's a valid answer in any cell" semantics), for direct
// comparability with that simulation.
@Service
public class AdminTrackingService {

    private static final int TRAILING_WINDOW_DAYS = 30;

    private final PuzzleRepository puzzleRepository;
    private final GridItemRepository gridItemRepository;
    private final GameModuleRegistry gameModuleRegistry;

    public AdminTrackingService(
            PuzzleRepository puzzleRepository, GridItemRepository gridItemRepository, GameModuleRegistry gameModuleRegistry) {
        this.puzzleRepository = puzzleRepository;
        this.gridItemRepository = gridItemRepository;
        this.gameModuleRegistry = gameModuleRegistry;
    }

    public AdminTrackingResponse buildReport(String gameId) {
        LocalDate today = PuzzleClock.today();
        List<Puzzle> eligible = puzzleRepository.findByGameIdAndModeAndPuzzleDateLessThanEqual(gameId, PuzzleMode.DAILY, today);

        List<GridItem> allEntities = gridItemRepository.findByGameId(gameId);
        Map<String, String> displayNameById = allEntities.stream()
            .collect(Collectors.toMap(GridItem::getId, GridItem::getDisplayName, (a, b) -> a));
        // Every category this game can ever produce, not just ones that
        // happened to show up in the eligible puzzles - what lets a
        // character/category that has NEVER appeared render as a real 0
        // row below, instead of being silently absent from the table.
        List<CategoryDefinition> allCategories = gameModuleRegistry.resolve(gameId).getCategoryDefinitions(allEntities);

        LocalDate trailingStart = today.minusDays(TRAILING_WINDOW_DAYS);
        Predicate<Puzzle> inTrailingWindow = p -> p.getPuzzleDate().isAfter(trailingStart);

        TrackingWindow allTime = buildWindow(eligible, p -> true, allEntities, allCategories, displayNameById,
            eligible.stream().map(Puzzle::getPuzzleDate).min(Comparator.naturalOrder()).orElse(today), today);
        TrackingWindow trailing30Days =
            buildWindow(eligible, inTrailingWindow, allEntities, allCategories, displayNameById, trailingStart, today);

        return new AdminTrackingResponse(allTime, trailing30Days);
    }

    // Package-private (not private), same convention as
    // PuzzleService.generateDailyPuzzle - a pure function of its arguments
    // (no repository/DB access), so AdminTrackingServiceTest can drive it
    // directly with hand-built Puzzle fixtures and no Spring context.
    TrackingWindow buildWindow(
            List<Puzzle> eligible, Predicate<Puzzle> windowFilter,
            List<GridItem> allEntities, List<CategoryDefinition> allCategories, Map<String, String> displayNameById,
            LocalDate windowStart, LocalDate windowEnd) {
        List<Puzzle> puzzles = eligible.stream().filter(windowFilter).toList();

        // Seeded with every real character/category at 0 before any puzzle
        // is counted, so one that never appeared in this window still
        // renders as a genuine 0 row rather than being missing entirely -
        // Map.merge below only ever adds to these existing entries, it
        // never needs a separate "is this id known" branch.
        Map<String, Integer> characterAppearances = new HashMap<>();
        for (GridItem item : allEntities) {
            characterAppearances.put(item.getId(), 0);
        }
        Map<String, Integer> categoryAppearances = new HashMap<>();
        Map<String, String> categoryLabelById = new HashMap<>();
        for (CategoryDefinition category : allCategories) {
            categoryAppearances.put(category.getId(), 0);
            categoryLabelById.put(category.getId(), category.getLabel());
        }
        Map<String, Integer> pairingAppearances = new HashMap<>(); // "dimA|dimB" -> count
        // Most recent puzzleDate each character/category was a valid answer
        // in, within this window - absent (not 0-seeded, unlike the count
        // maps above) means "never appeared", which is exactly what a
        // missing map entry already means once read via Map.get below.
        Map<String, LocalDate> characterLastSeen = new HashMap<>();
        Map<String, LocalDate> categoryLastSeen = new HashMap<>();

        for (Puzzle puzzle : puzzles) {
            LocalDate puzzleDate = puzzle.getPuzzleDate();

            // Characters: union of all cellSolutions values for this puzzle -
            // a character counts once per puzzle regardless of how many
            // cells it's a valid answer for.
            Set<String> charactersThisPuzzle = new HashSet<>();
            for (List<String> answers : puzzle.getCellSolutions().values()) {
                charactersThisPuzzle.addAll(answers);
            }
            for (String itemId : charactersThisPuzzle) {
                characterAppearances.merge(itemId, 1, Integer::sum);
                characterLastSeen.merge(itemId, puzzleDate, this::laterOf);
            }

            // Category values: all 6 row+col category ids - never overlapping
            // between row/col, per GridGenerator's dimension partitioning.
            List<CategorySnapshot> puzzleCategories = new ArrayList<>(puzzle.getRowCategories());
            puzzleCategories.addAll(puzzle.getColCategories());
            for (CategorySnapshot category : puzzleCategories) {
                categoryAppearances.merge(category.id(), 1, Integer::sum);
                categoryLabelById.putIfAbsent(category.id(), category.label());
                categoryLastSeen.merge(category.id(), puzzleDate, this::laterOf);
            }

            // Dimension pairings: distinct row dimensions x distinct col
            // dimensions actually used in this puzzle - not always 1x1, a
            // real puzzle can mix two dimensions on one side. Pair order
            // canonicalized alphabetically so "element x rarity" and
            // "rarity x element" tally together.
            Set<String> rowDims = puzzle.getRowCategories().stream().map(this::dimensionOf).collect(Collectors.toSet());
            Set<String> colDims = puzzle.getColCategories().stream().map(this::dimensionOf).collect(Collectors.toSet());
            for (String rowDim : rowDims) {
                for (String colDim : colDims) {
                    String dimensionA = rowDim.compareTo(colDim) <= 0 ? rowDim : colDim;
                    String dimensionB = rowDim.compareTo(colDim) <= 0 ? colDim : rowDim;
                    pairingAppearances.merge(dimensionA + "|" + dimensionB, 1, Integer::sum);
                }
            }
        }

        int puzzleCount = puzzles.size();

        List<CharacterAppearance> characters = characterAppearances.entrySet().stream()
            .map(e -> {
                LocalDate lastSeen = characterLastSeen.get(e.getKey());
                return new CharacterAppearance(
                    e.getKey(),
                    displayNameById.getOrDefault(e.getKey(), e.getKey()),
                    e.getValue(),
                    ratePct(e.getValue(), puzzleCount),
                    lastSeen,
                    daysSince(lastSeen, windowEnd));
            })
            // Ascending by appearances (rarest first) - mirrors what made the
            // fairness-report numbers useful earlier in this project.
            .sorted(Comparator.comparingInt(CharacterAppearance::appearances)
                .thenComparing(CharacterAppearance::displayName))
            .toList();

        List<CategoryAppearance> categories = categoryAppearances.entrySet().stream()
            .map(e -> {
                LocalDate lastSeen = categoryLastSeen.get(e.getKey());
                return new CategoryAppearance(
                    dimensionOf(e.getKey()),
                    e.getKey(),
                    categoryLabelById.getOrDefault(e.getKey(), e.getKey()),
                    e.getValue(),
                    ratePct(e.getValue(), puzzleCount),
                    lastSeen,
                    daysSince(lastSeen, windowEnd));
            })
            .sorted(Comparator.comparing(CategoryAppearance::dimension)
                .thenComparing(Comparator.comparingInt(CategoryAppearance::appearances).reversed())
                .thenComparing(CategoryAppearance::categoryId))
            .toList();

        List<DimensionPairing> pairings = pairingAppearances.entrySet().stream()
            .map(e -> {
                String[] parts = e.getKey().split("\\|", 2);
                return new DimensionPairing(parts[0], parts[1], e.getValue());
            })
            .sorted(Comparator.comparing(DimensionPairing::dimensionA).thenComparing(DimensionPairing::dimensionB))
            .toList();

        return new TrackingWindow(windowStart, windowEnd, puzzleCount, characters, categories, pairings);
    }

    private LocalDate laterOf(LocalDate a, LocalDate b) {
        return a.isAfter(b) ? a : b;
    }

    private String dimensionOf(CategorySnapshot category) {
        return dimensionOf(category.id());
    }

    private String dimensionOf(String categoryId) {
        int colonIndex = categoryId.indexOf(':');
        return colonIndex < 0 ? categoryId : categoryId.substring(0, colonIndex);
    }

    private double ratePct(int appearances, int puzzleCount) {
        return puzzleCount == 0 ? 0.0 : 100.0 * appearances / puzzleCount;
    }

    private Integer daysSince(LocalDate lastSeen, LocalDate windowEnd) {
        return lastSeen == null ? null : (int) ChronoUnit.DAYS.between(lastSeen, windowEnd);
    }
}
