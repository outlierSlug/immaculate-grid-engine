package com.tonyl.backend.puzzle;

import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.game.CategoryDefinition;

import java.time.LocalDate;
import java.util.*;

public class GridGenerator {

    private static final int GRID_SIZE = 3;
    private static final int MAX_ATTEMPTS = 500;

    public record GeneratedPuzzle(
        List<CategoryDefinition> rowCategories,
        List<CategoryDefinition> colCategories,
        Map<String, List<String>> cellSolutions // "row-col" -> matching GridItem ids
    ) {}

    /**
     * Seeded by date so everyone gets the same puzzle on the same day
     * without needing a server round-trip to hand it out.
     */
    public Optional<GeneratedPuzzle> generate(
        List<GridItem> entities,
        List<CategoryDefinition> categories,
        LocalDate date
    ) {
        if (categories.size() < GRID_SIZE * 2) {
            return Optional.empty(); // not enough categories to even attempt a grid
        }

        Random random = new Random(date.toEpochDay());

        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            List<CategoryDefinition> shuffled = new ArrayList<>(categories);
            Collections.shuffle(shuffled, random);

            List<CategoryDefinition> rows = shuffled.subList(0, GRID_SIZE);
            List<CategoryDefinition> cols = shuffled.subList(GRID_SIZE, GRID_SIZE * 2);

            Map<String, List<String>> solutions = new LinkedHashMap<>();
            boolean valid = true;

            outer:
            for (int r = 0; r < GRID_SIZE; r++) {
                for (int c = 0; c < GRID_SIZE; c++) {
                    CategoryDefinition rowCat = rows.get(r);
                    CategoryDefinition colCat = cols.get(c);

                    List<String> matches = entities.stream()
                        .filter(e -> rowCat.matches(e) && colCat.matches(e))
                        .map(GridItem::getId)
                        .toList();

                    if (matches.isEmpty()) {
                        valid = false;
                        break outer;
                    }
                    solutions.put(r + "-" + c, matches);
                }
            }

            if (valid) {
                return Optional.of(new GeneratedPuzzle(rows, cols, solutions));
            }
        }

        return Optional.empty(); // exhausted attempts without finding a valid grid
    }
}