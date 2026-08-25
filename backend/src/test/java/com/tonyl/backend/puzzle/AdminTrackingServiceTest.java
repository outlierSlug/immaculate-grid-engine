package com.tonyl.backend.puzzle;

import com.tonyl.backend.api.CategoryAppearance;
import com.tonyl.backend.api.CharacterAppearance;
import com.tonyl.backend.api.DimensionPairing;
import com.tonyl.backend.api.TrackingWindow;
import com.tonyl.backend.domain.CategorySnapshot;
import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.domain.PuzzleMode;
import com.tonyl.backend.game.AttributeEqualsCategory;
import com.tonyl.backend.game.CategoryDefinition;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Plain JUnit, hand-built Puzzle fixtures, no Spring context - drives
// AdminTrackingService.buildWindow directly (package-private for exactly
// this reason, same convention as PuzzleService.generateDailyPuzzle). The
// statistical invariants here are hard requirements per the plan, not
// informal reasoning: a future change to the counting logic that breaks
// one of these must fail the build.
class AdminTrackingServiceTest {

    private static final AdminTrackingService service = new AdminTrackingService(null, null, null);

    private static CategorySnapshot cat(String id, String label) {
        return new CategorySnapshot(id, label);
    }

    // Builds a full 3x3 puzzle. cellOverrides lets a test control specific
    // cells' answer lists (e.g. to make one character appear in multiple
    // cells); any cell not present in cellOverrides gets a unique
    // single-answer default so every fixture is still a "complete" puzzle
    // shape even when a test only cares about one or two cells.
    private static Puzzle puzzle(String id, LocalDate date, List<CategorySnapshot> rowCategories,
                                  List<CategorySnapshot> colCategories, Map<String, List<String>> cellOverrides) {
        Map<String, List<String>> cells = new java.util.LinkedHashMap<>();
        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                String key = r + "-" + c;
                cells.put(key, cellOverrides.getOrDefault(key, List.of(id + ":" + key + ":default")));
            }
        }
        return new Puzzle(id, "genshin", date, PuzzleMode.DAILY, null, rowCategories, colCategories, cells);
    }

    @Test
    void categoryValueSlotCountIsExactlySixTimesPuzzleCount() {
        List<CategorySnapshot> rows = List.of(cat("element:Pyro", "Pyro"), cat("element:Hydro", "Hydro"), cat("element:Anemo", "Anemo"));
        List<CategorySnapshot> cols = List.of(cat("rarity:5", "5-star"), cat("rarity:4", "4-star"), cat("weapon:Sword", "Sword"));

        List<Puzzle> puzzles = List.of(
            puzzle("genshin:2026-01-01", LocalDate.of(2026, 1, 1), rows, cols, Map.of()),
            puzzle("genshin:2026-01-02", LocalDate.of(2026, 1, 2), rows, cols, Map.of()),
            puzzle("genshin:2026-01-03", LocalDate.of(2026, 1, 3), rows, cols, Map.of())
        );

        TrackingWindow window = service.buildWindow(puzzles, p -> true, List.of(), List.of(), Map.of(),
            LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 3));

        assertEquals(3, window.puzzleCount());
        long totalCategorySlots = window.categories().stream().mapToLong(CategoryAppearance::appearances).sum();
        assertEquals(6L * window.puzzleCount(), totalCategorySlots,
            "total category-value appearance slots must equal exactly 6 * eligiblePuzzleCount");
    }

    @Test
    void dimensionPairingTotalMatchesDistinctRowTimesColDimensionsPerPuzzle() {
        // Puzzle A: 1 row dimension (element) x 2 col dimensions (rarity, weapon) -> 2 pairings.
        List<CategorySnapshot> rowsA = List.of(cat("element:Pyro", "Pyro"), cat("element:Hydro", "Hydro"), cat("element:Anemo", "Anemo"));
        List<CategorySnapshot> colsA = List.of(cat("rarity:5", "5-star"), cat("rarity:4", "4-star"), cat("weapon:Sword", "Sword"));
        Puzzle puzzleA = puzzle("genshin:2026-02-01", LocalDate.of(2026, 2, 1), rowsA, colsA, Map.of());

        // Puzzle B: 1 row dimension (region) x 1 col dimension (weapon) -> 1 pairing.
        List<CategorySnapshot> rowsB = List.of(cat("region:Mondstadt", "Mondstadt"), cat("region:Liyue", "Liyue"), cat("region:Inazuma", "Inazuma"));
        List<CategorySnapshot> colsB = List.of(cat("weapon:Bow", "Bow"), cat("weapon:Claymore", "Claymore"), cat("weapon:Catalyst", "Catalyst"));
        Puzzle puzzleB = puzzle("genshin:2026-02-02", LocalDate.of(2026, 2, 2), rowsB, colsB, Map.of());

        List<Puzzle> puzzles = List.of(puzzleA, puzzleB);

        TrackingWindow window = service.buildWindow(puzzles, p -> true, List.of(), List.of(), Map.of(),
            LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 2));

        long expectedTotal = 1L * 2 + 1L * 1; // puzzleA: 1 rowDim * 2 colDims, puzzleB: 1 rowDim * 1 colDim
        long actualTotal = window.pairings().stream().mapToLong(DimensionPairing::appearances).sum();
        assertEquals(expectedTotal, actualTotal,
            "dimension-pairing total must equal exactly sum(distinctRowDims * distinctColDims) per puzzle");

        // Canonicalized (alphabetical) ordering: "element" < "rarity" and
        // "element" < "weapon", so dimensionA/dimensionB come out in that
        // order regardless of which side (row/col) each dimension was on.
        assertTrue(window.pairings().stream().anyMatch(p ->
            p.dimensionA().equals("element") && p.dimensionB().equals("rarity") && p.appearances() == 1));
        assertTrue(window.pairings().stream().anyMatch(p ->
            p.dimensionA().equals("element") && p.dimensionB().equals("weapon") && p.appearances() == 1));
        assertTrue(window.pairings().stream().anyMatch(p ->
            p.dimensionA().equals("region") && p.dimensionB().equals("weapon") && p.appearances() == 1));
    }

    @Test
    void characterCountsOnceExactlyPerPuzzleEvenWhenValidInMultipleCells() {
        List<CategorySnapshot> rows = List.of(cat("element:Pyro", "Pyro"), cat("element:Hydro", "Hydro"), cat("element:Anemo", "Anemo"));
        List<CategorySnapshot> cols = List.of(cat("rarity:5", "5-star"), cat("rarity:4", "4-star"), cat("weapon:Sword", "Sword"));

        // "diluc" is a valid answer for both cell 0-0 and cell 1-1 of the
        // SAME puzzle - must still contribute exactly 1 appearance for this
        // puzzle, not 2.
        Map<String, List<String>> overrides = Map.of(
            "0-0", List.of("diluc", "klee"),
            "1-1", List.of("diluc", "xiangling")
        );
        Puzzle onlyPuzzle = puzzle("genshin:2026-03-01", LocalDate.of(2026, 3, 1), rows, cols, overrides);

        TrackingWindow window = service.buildWindow(List.of(onlyPuzzle), p -> true, List.of(), List.of(), Map.of(),
            LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 1));

        CharacterAppearance diluc = window.characters().stream()
            .filter(c -> c.itemId().equals("diluc"))
            .findFirst()
            .orElseThrow(() -> new AssertionError("diluc should appear in the character appearance list"));
        assertEquals(1, diluc.appearances(),
            "a character valid in multiple cells of the same puzzle must still count once for that puzzle");
    }

    @Test
    void windowFilterExcludesPuzzlesOutsideTheWindow() {
        List<CategorySnapshot> rows = List.of(cat("element:Pyro", "Pyro"), cat("element:Hydro", "Hydro"), cat("element:Anemo", "Anemo"));
        List<CategorySnapshot> cols = List.of(cat("rarity:5", "5-star"), cat("rarity:4", "4-star"), cat("weapon:Sword", "Sword"));

        Puzzle inWindow = puzzle("genshin:2026-04-15", LocalDate.of(2026, 4, 15), rows, cols, Map.of());
        Puzzle outOfWindow = puzzle("genshin:2026-01-01", LocalDate.of(2026, 1, 1), rows, cols, Map.of());

        LocalDate trailingStart = LocalDate.of(2026, 3, 17); // today.minusDays(30) for today=2026-04-16
        TrackingWindow window = service.buildWindow(
            List.of(inWindow, outOfWindow), p -> p.getPuzzleDate().isAfter(trailingStart), List.of(), List.of(), Map.of(),
            trailingStart, LocalDate.of(2026, 4, 16));

        assertEquals(1, window.puzzleCount());
    }

    @Test
    void characterAndCategoryNeverAppearingStillRenderAsGenuineZeroRows() {
        List<CategorySnapshot> rows = List.of(cat("element:Pyro", "Pyro"), cat("element:Hydro", "Hydro"), cat("element:Anemo", "Anemo"));
        List<CategorySnapshot> cols = List.of(cat("rarity:5", "5-star"), cat("rarity:4", "4-star"), cat("weapon:Sword", "Sword"));
        Puzzle onlyPuzzle = puzzle("genshin:2026-05-01", LocalDate.of(2026, 5, 1), rows, cols, Map.of());

        // "neverAppears" is a real roster entry that just never happens to
        // be a valid answer for this puzzle; "rarity:3" is a real category
        // this game can produce that this puzzle simply didn't draw.
        List<GridItem> allEntities = List.of(
            new GridItem("neverAppears", "genshin", "Never Appears", "", Map.of()),
            new GridItem("onlyPuzzle:0-0:default", "genshin", "Default Answer", "", Map.of())
        );
        List<CategoryDefinition> allCategories = List.of(
            new AttributeEqualsCategory("3-star", "rarity", "3")
        );

        TrackingWindow window = service.buildWindow(List.of(onlyPuzzle), p -> true, allEntities, allCategories, Map.of(),
            LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 1));

        CharacterAppearance neverAppears = window.characters().stream()
            .filter(c -> c.itemId().equals("neverAppears"))
            .findFirst()
            .orElseThrow(() -> new AssertionError("a real roster entry that never appeared should still be a row"));
        assertEquals(0, neverAppears.appearances());
        assertEquals(0.0, neverAppears.appearanceRatePct());
        assertEquals(null, neverAppears.lastAppearanceDate());
        assertEquals(null, neverAppears.daysSinceLastAppearance());

        CategoryAppearance neverDrawn = window.categories().stream()
            .filter(c -> c.categoryId().equals("rarity:3"))
            .findFirst()
            .orElseThrow(() -> new AssertionError("a real category that was never drawn should still be a row"));
        assertEquals(0, neverDrawn.appearances());
        assertEquals("3-star", neverDrawn.label());
        assertEquals(null, neverDrawn.lastAppearanceDate());
        assertEquals(null, neverDrawn.daysSinceLastAppearance());
    }

    @Test
    void lastAppearanceTracksTheMostRecentPuzzleAndDaysSinceIsRelativeToWindowEnd() {
        List<CategorySnapshot> rows = List.of(cat("element:Pyro", "Pyro"), cat("element:Hydro", "Hydro"), cat("element:Anemo", "Anemo"));
        List<CategorySnapshot> cols = List.of(cat("rarity:5", "5-star"), cat("rarity:4", "4-star"), cat("weapon:Sword", "Sword"));

        // "diluc" appears in both puzzles - the EARLIER one first in the
        // list, to prove lastAppearanceDate tracks the most recent date
        // regardless of iteration order, not just "whichever puzzle came
        // last in the list". "klee" appears only in the earlier puzzle, to
        // prove a character's last-seen date isn't dragged forward by a
        // later puzzle it wasn't actually in.
        Puzzle earlier = puzzle("genshin:2026-06-01", LocalDate.of(2026, 6, 1), rows, cols,
            Map.of("0-0", List.of("diluc", "klee")));
        Puzzle later = puzzle("genshin:2026-06-10", LocalDate.of(2026, 6, 10), rows, cols,
            Map.of("0-0", List.of("diluc")));

        TrackingWindow window = service.buildWindow(List.of(earlier, later), p -> true, List.of(), List.of(), Map.of(),
            LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 15));

        CharacterAppearance diluc = window.characters().stream()
            .filter(c -> c.itemId().equals("diluc")).findFirst()
            .orElseThrow(() -> new AssertionError("diluc should appear"));
        assertEquals(LocalDate.of(2026, 6, 10), diluc.lastAppearanceDate(),
            "lastAppearanceDate must be the MOST RECENT puzzle diluc appeared in, not the first encountered");
        assertEquals(5, diluc.daysSinceLastAppearance(), // June 10 -> June 15 windowEnd = 5 days
            "daysSinceLastAppearance must be computed against windowEnd, not today() or the window start");

        CharacterAppearance klee = window.characters().stream()
            .filter(c -> c.itemId().equals("klee")).findFirst()
            .orElseThrow(() -> new AssertionError("klee should appear"));
        assertEquals(LocalDate.of(2026, 6, 1), klee.lastAppearanceDate(),
            "klee's last appearance must stay June 1 - it was never in the later puzzle");
        assertEquals(14, klee.daysSinceLastAppearance());

        CategoryAppearance pyro = window.categories().stream()
            .filter(c -> c.categoryId().equals("element:Pyro")).findFirst()
            .orElseThrow(() -> new AssertionError("element:Pyro should appear"));
        assertEquals(LocalDate.of(2026, 6, 10), pyro.lastAppearanceDate(),
            "a category value appearing on both puzzles' rows must also track the later date");
    }
}
