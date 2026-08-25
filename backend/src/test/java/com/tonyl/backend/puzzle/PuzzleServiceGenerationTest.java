package com.tonyl.backend.puzzle;

import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.game.BrawlStarsGameModule;
import com.tonyl.backend.game.CategoryDefinition;
import com.tonyl.backend.game.GameModule;
import com.tonyl.backend.game.GenshinGameModule;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;

// Verifies the retry + exhaustive-fallback fix added to
// PuzzleService.generateDailyPuzzle for the single-seed Daily generation
// failures found by GridGeneratorTest#characterFairnessReport (Brawl Stars
// measured at a ~42% single-seed failure rate under the old
// generateAndSave, which called GridGenerator.generate() exactly once with
// no fallback). Constructed with null repositories since
// generateDailyPuzzle never touches them - it's a pure function of its
// arguments.
class PuzzleServiceGenerationTest {

    private static final PuzzleService service = new PuzzleService(null, null, null, null, null);

    private static List<GridItem> loadEntities(String resourceName) throws Exception {
        JsonMapper mapper = JsonMapper.builder().build();
        try (InputStream is = PuzzleServiceGenerationTest.class.getClassLoader().getResourceAsStream(resourceName)) {
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
            new Object[]{ "genshin", new GenshinGameModule(), loadEntities("genshin_entities.json") },
            new Object[]{ "brawlstars", new BrawlStarsGameModule(), loadEntities("brawlstars_entities.json") }
        );
    }

    @ParameterizedTest
    @MethodSource("gameModules")
    void dailyGenerationNeverFailsAcrossManyDates(String gameId, GameModule module, List<GridItem> entities) {
        List<CategoryDefinition> categories = module.getCategoryDefinitions(entities);
        LocalDate start = LocalDate.of(2026, 1, 1);
        int sampleDays = 1000;
        int failures = 0;

        for (int i = 0; i < sampleDays; i++) {
            LocalDate date = start.plusDays(i);
            try {
                service.generateDailyPuzzle(gameId, entities, categories, date);
            } catch (IllegalStateException e) {
                failures++;
            }
        }

        System.out.printf("%s: %d/%d dates failed after the retry+fallback fix%n", gameId, failures, sampleDays);
        assertEquals(0, failures,
            gameId + " should never fail to generate a Daily puzzle now that the retry+exhaustive fallback is in place");
    }

    @Test
    void dailyGenerationStaysDeterministic() throws Exception {
        GameModule module = new BrawlStarsGameModule();
        List<GridItem> entities = loadEntities("brawlstars_entities.json");
        List<CategoryDefinition> categories = module.getCategoryDefinitions(entities);
        LocalDate date = LocalDate.of(2026, 3, 17);

        var first = service.generateDailyPuzzle("brawlstars", entities, categories, date);
        var second = service.generateDailyPuzzle("brawlstars", entities, categories, date);

        assertEquals(
            first.rowCategories().stream().map(CategoryDefinition::getId).toList(),
            second.rowCategories().stream().map(CategoryDefinition::getId).toList(),
            "Same date should always produce the same puzzle, even when the exhaustive fallback path is involved"
        );
        assertEquals(first.cellSolutions(), second.cellSolutions());
    }
}
