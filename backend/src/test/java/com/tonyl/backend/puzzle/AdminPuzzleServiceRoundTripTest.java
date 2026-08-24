package com.tonyl.backend.puzzle;

import com.tonyl.backend.api.PinPuzzleRequest;
import com.tonyl.backend.domain.CategorySnapshot;
import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.game.CategoryDefinition;
import com.tonyl.backend.game.GameModule;
import com.tonyl.backend.game.GameModuleRegistry;
import com.tonyl.backend.game.GenshinGameModule;
import com.tonyl.backend.repository.GridItemRepository;
import com.tonyl.backend.repository.PuzzleRepository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Real persistence round trip for pinFuturePuzzle, unlike the plain-JUnit
// rejection cases in AdminPuzzleServiceTest - needs an actual JPA/Postgres
// context because the entity's JSONB columns (CategorySnapshot/
// cellSolutions) go through the real hypersistence-utils JsonType mapping.
// @AutoConfigureTestDatabase(Replace.NONE) keeps this on the real
// configured datasource rather than an embedded one (no H2 dependency
// exists in this project - see docs/ARCHITECTURE.md's JSONB notes).
// @DataJpaTest wraps each test in a transaction rolled back at the end, so
// no manual cleanup of the inserted row is needed.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AdminPuzzleServiceRoundTripTest {

    @Autowired
    private PuzzleRepository puzzleRepository;

    @Autowired
    private GridItemRepository gridItemRepository;

    @Test
    void pinThenReadBackRoundTrip() {
        AdminPuzzleService service = new AdminPuzzleService(gridItemRepository, puzzleRepository, new GameModuleRegistry(), null, null);

        List<CategorySnapshot> rows = List.of(
            new CategorySnapshot("element:Pyro", "Pyro"),
            new CategorySnapshot("element:Hydro", "Hydro"),
            new CategorySnapshot("element:Anemo", "Anemo")
        );
        List<CategorySnapshot> cols = List.of(
            new CategorySnapshot("rarity:5", "5-star"),
            new CategorySnapshot("rarity:4", "4-star"),
            new CategorySnapshot("weapon:Sword", "Sword")
        );
        Map<String, List<String>> cells = new LinkedHashMap<>();
        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                cells.put(r + "-" + c, List.of("char-" + r + "-" + c));
            }
        }
        // pinFuturePuzzle now validates every cellSolutions id is a real
        // GridItem for the game (see AdminPuzzleService.validateItemIds) -
        // these placeholder "char-r-c" ids need to actually exist for this
        // round trip to reach that far. @DataJpaTest rolls this transaction
        // back, so no manual cleanup needed.
        gridItemRepository.saveAll(
            cells.values().stream().flatMap(List::stream)
                .map(id -> new GridItem(id, "genshin", id, "", Map.of()))
                .toList()
        );
        // Far enough in the future that it can never collide with a real
        // pinned date exercised elsewhere.
        LocalDate future = LocalDate.of(2099, 6, 15);
        PinPuzzleRequest request = new PinPuzzleRequest(rows, cols, cells);

        Puzzle pinned = service.pinFuturePuzzle("genshin", future, request);
        assertEquals("genshin:" + future, pinned.getId());

        Optional<Puzzle> readBack = puzzleRepository.findById(pinned.getId());
        assertTrue(readBack.isPresent(), "pinned puzzle should be readable back by its deterministic id");
        assertEquals(rows, readBack.get().getRowCategories());
        assertEquals(cols, readBack.get().getColCategories());
        assertEquals(cells, readBack.get().getCellSolutions());

        // Re-pinning the same future date with a different candidate proves
        // the upsert/overwrite mechanism, not just first-write.
        gridItemRepository.save(new GridItem("someone-else", "genshin", "someone-else", "", Map.of()));
        Map<String, List<String>> replacementCells = new LinkedHashMap<>(cells);
        replacementCells.put("1-1", List.of("someone-else"));
        PinPuzzleRequest replacementRequest = new PinPuzzleRequest(rows, cols, replacementCells);
        service.pinFuturePuzzle("genshin", future, replacementRequest);

        Optional<Puzzle> readBackAfterRepin = puzzleRepository.findById(pinned.getId());
        assertTrue(readBackAfterRepin.isPresent());
        assertEquals(List.of("someone-else"), readBackAfterRepin.get().getCellSolutions().get("1-1"));
    }

    // Proves the unconditional hasPerfectMatching gate added to
    // pinFuturePuzzle doesn't false-positive on a legitimately generated
    // grid - a real GridGenerator.generateCandidates() output, reposted
    // verbatim (same shape GET /candidates -> POST /pin uses in practice),
    // must still pin successfully. Needs real persistence (unlike the
    // rejection-only cases in AdminPuzzleServiceTest), hence living here.
    @Test
    void repostingARealGeneratedCandidateVerbatimStillPinsSuccessfully() throws Exception {
        List<GridItem> entities = loadEntities("genshin_entities.json");
        GameModule module = new GenshinGameModule();
        List<CategoryDefinition> categories = module.getCategoryDefinitions(entities);

        GridGenerator generator = new GridGenerator();
        List<GridGenerator.GeneratedPuzzle> candidates =
            generator.generateCandidates(entities, categories, ThreadLocalRandom.current().nextLong(), 1, true, 1);
        assertTrue(candidates.size() == 1, "expected generateCandidates to find at least one valid candidate");
        GridGenerator.GeneratedPuzzle candidate = candidates.get(0);

        PinPuzzleRequest request = new PinPuzzleRequest(
            candidate.rowCategories().stream().map(CategorySnapshot::from).toList(),
            candidate.colCategories().stream().map(CategorySnapshot::from).toList(),
            candidate.cellSolutions()
        );

        // Uses the real gridItemRepository (not null) - candidate.cellSolutions
        // ids come from genshin_entities.json, the same canonical roster
        // already seeded into this same real dev DB (see class doc comment on
        // why this test runs against real Postgres, not an isolated H2), so
        // validateItemIds finds them for real rather than needing a mock.
        AdminPuzzleService service = new AdminPuzzleService(gridItemRepository, puzzleRepository, new GameModuleRegistry(), null, null);
        LocalDate future = LocalDate.of(2099, 7, 20); // far enough out to never collide with a real pinned date
        Puzzle pinned = service.pinFuturePuzzle("genshin", future, request);

        assertEquals("genshin:" + future, pinned.getId());
    }

    // Same seed-file-loading helper as GridGeneratorTest/
    // PuzzleServiceGenerationTest.
    private static List<GridItem> loadEntities(String resourceName) throws Exception {
        JsonMapper mapper = JsonMapper.builder().build();
        try (InputStream is = AdminPuzzleServiceRoundTripTest.class.getClassLoader().getResourceAsStream(resourceName)) {
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
}
