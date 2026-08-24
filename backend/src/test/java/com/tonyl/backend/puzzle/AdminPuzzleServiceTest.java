package com.tonyl.backend.puzzle;

import com.tonyl.backend.api.PinPuzzleRequest;
import com.tonyl.backend.domain.CategorySnapshot;
import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.game.GameModule;
import com.tonyl.backend.game.GameModuleRegistry;
import com.tonyl.backend.game.GenshinGameModule;

import org.junit.jupiter.api.Test;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Plain JUnit, no Spring context - every case here is rejected before
// AdminPuzzleService ever touches a repository, so gridItemRepository/
// puzzleRepository can stay null (same convention as
// PuzzleServiceGenerationTest constructing PuzzleService(null, null, null)).
// GameModuleRegistry has no dependencies of its own, so a real instance is
// used wherever pinFuturePuzzle is under test, since it resolves the gameId
// before the date check.
class AdminPuzzleServiceTest {

    private static final List<CategorySnapshot> VALID_ROWS = List.of(
        new CategorySnapshot("element:Pyro", "Pyro"),
        new CategorySnapshot("element:Hydro", "Hydro"),
        new CategorySnapshot("element:Anemo", "Anemo")
    );
    private static final List<CategorySnapshot> VALID_COLS = List.of(
        new CategorySnapshot("rarity:5", "5-star"),
        new CategorySnapshot("rarity:4", "4-star"),
        new CategorySnapshot("weapon:Sword", "Sword")
    );

    private static Map<String, List<String>> validCellSolutions() {
        Map<String, List<String>> cells = new LinkedHashMap<>();
        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                cells.put(r + "-" + c, List.of("char-" + r + "-" + c));
            }
        }
        return cells;
    }

    // Same "char" as the sole answer for two different cells - every cell
    // still individually has >=1 answer (validateShape passes), but no full
    // 9-distinct-character assignment exists, since both 0-0 and 1-1 can
    // only ever be filled by "shared-only-answer".
    private static Map<String, List<String>> unsolvableCellSolutions() {
        Map<String, List<String>> cells = new LinkedHashMap<>(validCellSolutions());
        cells.put("0-0", List.of("shared-only-answer"));
        cells.put("1-1", List.of("shared-only-answer"));
        return cells;
    }

    // Reads the same seed file the backend actually loads, same pattern as
    // GridGeneratorTest/PuzzleServiceGenerationTest's loadEntities helper -
    // needed for evaluateGrid's tests, which exercise real category
    // predicate matching rather than hand-built fixtures.
    private static List<GridItem> loadEntities(String resourceName) throws Exception {
        JsonMapper mapper = JsonMapper.builder().build();
        try (InputStream is = AdminPuzzleServiceTest.class.getClassLoader().getResourceAsStream(resourceName)) {
            List<Map<String, Object>> raw = mapper.readValue(is, new TypeReference<>() {});
            return raw.stream().map(r -> new GridItem(
                (String) r.get("id"),
                (String) r.get("game_id"),
                (String) r.get("display_name"),
                (String) r.get("image_url"),
                (Map<String, Object>) r.get("attributes")
            )).toList();
        }
    }

    // ── generateCandidates ──

    @Test
    void generateCandidatesRejectsTodayAsDate() {
        AdminPuzzleService service = new AdminPuzzleService(null, null, null, null, null);
        assertThrows(IllegalArgumentException.class,
            () -> service.generateCandidates("genshin", PuzzleClock.today(), 5, 1));
    }

    @Test
    void generateCandidatesRejectsPastDate() {
        AdminPuzzleService service = new AdminPuzzleService(null, null, null, null, null);
        assertThrows(IllegalArgumentException.class,
            () -> service.generateCandidates("genshin", PuzzleClock.today().minusDays(1), 5, 1));
    }

    @Test
    void generateCandidatesRejectsCountBelowRange() {
        AdminPuzzleService service = new AdminPuzzleService(null, null, null, null, null);
        LocalDate future = PuzzleClock.today().plusDays(14);
        assertThrows(IllegalArgumentException.class,
            () -> service.generateCandidates("genshin", future, 0, 1));
    }

    @Test
    void generateCandidatesRejectsCountAboveRange() {
        AdminPuzzleService service = new AdminPuzzleService(null, null, null, null, null);
        LocalDate future = PuzzleClock.today().plusDays(14);
        assertThrows(IllegalArgumentException.class,
            () -> service.generateCandidates("genshin", future, 21, 1)); // MAX_CANDIDATES = 20
    }

    // ── pinFuturePuzzle: date immutability ──

    @Test
    void pinFuturePuzzleRejectsTodayAsDate() {
        AdminPuzzleService service = new AdminPuzzleService(null, null, new GameModuleRegistry(), null, null);
        PinPuzzleRequest request = new PinPuzzleRequest(VALID_ROWS, VALID_COLS, validCellSolutions());
        assertThrows(IllegalArgumentException.class,
            () -> service.pinFuturePuzzle("genshin", PuzzleClock.today(), request));
    }

    @Test
    void pinFuturePuzzleRejectsPastDate() {
        AdminPuzzleService service = new AdminPuzzleService(null, null, new GameModuleRegistry(), null, null);
        PinPuzzleRequest request = new PinPuzzleRequest(VALID_ROWS, VALID_COLS, validCellSolutions());
        assertThrows(IllegalArgumentException.class,
            () -> service.pinFuturePuzzle("genshin", PuzzleClock.today().minusDays(1), request));
    }

    // ── pinFuturePuzzle: validateShape ──

    @Test
    void pinFuturePuzzleRejectsWrongCategoryCount() {
        AdminPuzzleService service = new AdminPuzzleService(null, null, new GameModuleRegistry(), null, null);
        LocalDate future = PuzzleClock.today().plusDays(14);
        List<CategorySnapshot> tooFewRows = List.of(VALID_ROWS.get(0), VALID_ROWS.get(1)); // only 2, not 3
        PinPuzzleRequest request = new PinPuzzleRequest(tooFewRows, VALID_COLS, validCellSolutions());
        assertThrows(IllegalArgumentException.class,
            () -> service.pinFuturePuzzle("genshin", future, request));
    }

    @Test
    void pinFuturePuzzleRejectsMissingCellKey() {
        AdminPuzzleService service = new AdminPuzzleService(null, null, new GameModuleRegistry(), null, null);
        LocalDate future = PuzzleClock.today().plusDays(14);
        Map<String, List<String>> incompleteCells = new LinkedHashMap<>(validCellSolutions());
        incompleteCells.remove("2-2");
        PinPuzzleRequest request = new PinPuzzleRequest(VALID_ROWS, VALID_COLS, incompleteCells);
        assertThrows(IllegalArgumentException.class,
            () -> service.pinFuturePuzzle("genshin", future, request));
    }

    @Test
    void pinFuturePuzzleRejectsEmptyAnswerList() {
        AdminPuzzleService service = new AdminPuzzleService(null, null, new GameModuleRegistry(), null, null);
        LocalDate future = PuzzleClock.today().plusDays(14);
        Map<String, List<String>> cellsWithEmptyAnswer = new LinkedHashMap<>(validCellSolutions());
        cellsWithEmptyAnswer.put("1-1", List.of());
        PinPuzzleRequest request = new PinPuzzleRequest(VALID_ROWS, VALID_COLS, cellsWithEmptyAnswer);
        assertThrows(IllegalArgumentException.class,
            () -> service.pinFuturePuzzle("genshin", future, request));
    }

    @Test
    void pinFuturePuzzleRejectsUnknownGameId() {
        AdminPuzzleService service = new AdminPuzzleService(null, null, new GameModuleRegistry(), null, null);
        LocalDate future = PuzzleClock.today().plusDays(14);
        PinPuzzleRequest request = new PinPuzzleRequest(VALID_ROWS, VALID_COLS, validCellSolutions());
        assertThrows(IllegalArgumentException.class,
            () -> service.pinFuturePuzzle("nonexistent", future, request));
    }

    // ── pinFuturePuzzle: solvability gate ──

    @Test
    void pinFuturePuzzleRejectsGridWithNoValidFullAssignment() {
        AdminPuzzleService service = new AdminPuzzleService(null, null, new GameModuleRegistry(), null, null);
        LocalDate future = PuzzleClock.today().plusDays(14);
        // Every cell individually has >=1 answer (validateShape passes), but
        // "shared-only-answer" is the sole candidate for two different
        // cells, so no full 9-distinct-character assignment exists. Drives
        // the package-private buildPinnedPuzzle overload directly (same
        // "pure function, no repository needed" convention as evaluateGrid's
        // own overload below) with a validItemIds set built from the
        // request's own ids, so this test is purely about the solvability
        // gate, not item-id validation.
        Map<String, List<String>> cells = unsolvableCellSolutions();
        Set<String> validItemIds = cells.values().stream().flatMap(List::stream).collect(Collectors.toSet());
        PinPuzzleRequest request = new PinPuzzleRequest(VALID_ROWS, VALID_COLS, cells);
        assertThrows(IllegalArgumentException.class,
            () -> service.buildPinnedPuzzle("genshin", future, request, validItemIds));
    }

    @Test
    void pinFuturePuzzleRejectsUnknownItemId() {
        AdminPuzzleService service = new AdminPuzzleService(null, null, new GameModuleRegistry(), null, null);
        LocalDate future = PuzzleClock.today().plusDays(14);
        Map<String, List<String>> cells = validCellSolutions();
        PinPuzzleRequest request = new PinPuzzleRequest(VALID_ROWS, VALID_COLS, cells);
        // Empty validItemIds - none of validCellSolutions()'s "char-r-c" ids
        // are "real", so every one should be rejected.
        assertThrows(IllegalArgumentException.class,
            () -> service.buildPinnedPuzzle("genshin", future, request, Set.of()));
    }

    // ── evaluateGrid ──
    //
    // Uses the package-private evaluateGrid(GameModule, List<GridItem>, ...)
    // overload directly with real entity data, so no GridItemRepository/DB
    // is needed - same "pure function of its arguments" testing convention
    // as PuzzleService.generateDailyPuzzle / PuzzleServiceGenerationTest.

    @Test
    void evaluateGridWithConflictingSameDimensionCategoriesIsEmptyAndUnsolvable() throws Exception {
        List<GridItem> entities = loadEntities("genshin_entities.json");
        GameModule module = new GenshinGameModule();
        AdminPuzzleService service = new AdminPuzzleService(null, null, null, null, null);

        // Two real Genshin element categories, one per side - no character can
        // simultaneously be two different elements, so every cell is empty and
        // the grid as a whole has no valid full assignment.
        List<String> rowIds = List.of("element:Pyro", "element:Hydro", "element:Anemo");
        List<String> colIds = List.of("element:Cryo", "element:Electro", "element:Geo");

        AdminPuzzleService.EvaluatedGrid evaluated = service.evaluateGrid(module, entities, rowIds, colIds);

        assertTrue(evaluated.cellSolutions().values().stream().allMatch(List::isEmpty),
            "no entity can match two different element categories at once - every cell should be empty");
        assertFalse(evaluated.solvable());
    }

    @Test
    void evaluateGridRejectsUnknownCategoryId() throws Exception {
        List<GridItem> entities = loadEntities("genshin_entities.json");
        GameModule module = new GenshinGameModule();
        AdminPuzzleService service = new AdminPuzzleService(null, null, null, null, null);

        List<String> rowIds = List.of("element:Pyro", "element:Hydro", "element:Anemo");
        List<String> colIds = List.of("rarity:5", "rarity:4", "nonexistent:category");

        assertThrows(IllegalArgumentException.class,
            () -> service.evaluateGrid(module, entities, rowIds, colIds));
    }

    @Test
    void evaluateGridRejectsWrongCategoryCount() throws Exception {
        List<GridItem> entities = loadEntities("genshin_entities.json");
        GameModule module = new GenshinGameModule();
        AdminPuzzleService service = new AdminPuzzleService(null, null, null, null, null);

        List<String> tooFewRows = List.of("element:Pyro", "element:Hydro"); // only 2, not 3
        List<String> colIds = List.of("rarity:5", "rarity:4", "weapon:Sword");

        assertThrows(IllegalArgumentException.class,
            () -> service.evaluateGrid(module, entities, tooFewRows, colIds));
    }
}
