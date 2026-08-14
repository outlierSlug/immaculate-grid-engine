package com.tonyl.backend;

import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.game.CategoryDefinition;
import com.tonyl.backend.game.GameModule;
import com.tonyl.backend.game.GenshinGameModule;
import com.tonyl.backend.puzzle.GridGenerator;
import com.tonyl.backend.game.BrawlStarsGameModule;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

class GridGeneratorTest {

    private static final int DATES_TO_TEST = 365; // ~1 year of distinct seeds
    private static final GridGenerator generator = new GridGenerator();

    // ── Data loading (reads the same seed files the backend actually loads) ──

    private static List<GridItem> loadEntities(String resourceName) throws Exception {
        JsonMapper mapper = JsonMapper.builder().build();
        try (InputStream is = GridGeneratorTest.class.getClassLoader().getResourceAsStream(resourceName)) {
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

    static Stream<Object[]> gameModules() throws Exception {
        return Stream.of(
            new Object[]{ new GenshinGameModule(), loadEntities("genshin_entities.json") },
            new Object[]{ new BrawlStarsGameModule(), loadEntities("brawlstars_entities.json") }
        );
    }

    // ── The actual rigorous check ──

    @ParameterizedTest
    @MethodSource("gameModules")
    void generatedPuzzlesAreCorrectAndComplete(GameModule module, List<GridItem> entities) {
        List<CategoryDefinition> categories = module.getCategoryDefinitions(entities);
        int successCount = 0;

        for (int i = 0; i < DATES_TO_TEST; i++) {
            LocalDate date = LocalDate.of(2026, 1, 1).plusDays(i);
            Optional<GridGenerator.GeneratedPuzzle> result = generator.generate(entities, categories, date);

            if (result.isEmpty()) continue; // occasional failure is acceptable, tracked below
            successCount++;

            GridGenerator.GeneratedPuzzle puzzle = result.get();

            // Invariant 1: row/col dimensions never overlap
            Set<String> rowDims = puzzle.rowCategories().stream().map(CategoryDefinition::getDimension).collect(Collectors.toSet());
            Set<String> colDims = puzzle.colCategories().stream().map(CategoryDefinition::getDimension).collect(Collectors.toSet());
            Set<String> overlap = new HashSet<>(rowDims);
            overlap.retainAll(colDims);
            assertTrue(overlap.isEmpty(),
                "Date " + date + ": row/col categories share a dimension " + overlap + " — the dimension-collision bug has regressed");

            // Invariant 2: every cell's stored solution set is EXACTLY the set of entities
            // that truly satisfy both categories — not a subset, not a superset.
            for (int r = 0; r < 3; r++) {
                for (int c = 0; c < 3; c++) {
                    CategoryDefinition rowCat = puzzle.rowCategories().get(r);
                    CategoryDefinition colCat = puzzle.colCategories().get(c);

                    Set<String> trueMatches = entities.stream()
                        .filter(e -> rowCat.matches(e) && colCat.matches(e))
                        .map(GridItem::getId)
                        .collect(Collectors.toSet());

                    Set<String> storedMatches = new HashSet<>(puzzle.cellSolutions().get(r + "-" + c));

                    assertEquals(trueMatches, storedMatches,
                        "Date " + date + ", cell " + r + "-" + c + " (" + rowCat.getLabel() + " x " + colCat.getLabel()
                        + "): stored solutions don't match recomputed truth");

                    assertFalse(storedMatches.isEmpty(),
                        "Date " + date + ", cell " + r + "-" + c + " has zero valid answers but was accepted as a valid puzzle");
                }
            }
        }

        // Invariant 3: generation should succeed the vast majority of the time.
        // Not 100% required (small datasets can legitimately hit a bad shuffle now
        // and then within the retry budget), but a high failure rate signals a
        // real problem, not noise.
        double successRate = (double) successCount / DATES_TO_TEST;
        assertTrue(successRate > 0.9,
            "Only " + successCount + "/" + DATES_TO_TEST + " dates produced a valid puzzle (" + (successRate * 100) + "%) — investigate category thinness");
    }

    @Test
    void singleDeterministicPuzzleIsReproducible() throws Exception {
        List<GridItem> entities = loadEntities("genshin_entities.json");
        GameModule module = new GenshinGameModule();
        List<CategoryDefinition> categories = module.getCategoryDefinitions(entities);
        LocalDate date = LocalDate.of(2026, 8, 12);

        var first = generator.generate(entities, categories, date);
        var second = generator.generate(entities, categories, date);

        assertTrue(first.isPresent() && second.isPresent());
        assertEquals(
            first.get().rowCategories().stream().map(CategoryDefinition::getId).toList(),
            second.get().rowCategories().stream().map(CategoryDefinition::getId).toList(),
            "Same date should always produce the same puzzle (determinism guarantee for 'today's puzzle')"
        );
    }
}