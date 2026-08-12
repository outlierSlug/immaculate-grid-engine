package com.tonyl.backend.puzzle;

import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.game.CategoryDefinition;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

public class GridGenerator {

    private static final int GRID_SIZE = 3;
    private static final int MAX_ATTEMPTS = 500;

    public record GeneratedPuzzle(
        List<CategoryDefinition> rowCategories,
        List<CategoryDefinition> colCategories,
        Map<String, List<String>> cellSolutions
    ) {}

    public Optional<GeneratedPuzzle> generate(
        List<GridItem> entities,
        List<CategoryDefinition> categories,
        LocalDate date
    ) {
        Map<String, List<CategoryDefinition>> byDimension = categories.stream()
            .collect(Collectors.groupingBy(CategoryDefinition::getDimension));

        List<String> dimensions = new ArrayList<>(byDimension.keySet());
        if (dimensions.size() < 2) {
            return Optional.empty(); // need at least 2 dimensions to split rows/cols safely
        }

        Random random = new Random(date.toEpochDay());

        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            Collections.shuffle(dimensions, random);

            // Split dimensions into two non-empty groups: one feeds rows, the other feeds
            // columns. This guarantees no row category and column category ever share a
            // dimension, which would otherwise make that cell impossible to fill (e.g.
            // rarity==Legendary AND rarity==Epic can never both be true for one entity).
            int splitPoint = 1 + random.nextInt(dimensions.size() - 1);
            List<String> rowDimensions = dimensions.subList(0, splitPoint);
            List<String> colDimensions = dimensions.subList(splitPoint, dimensions.size());

            List<CategoryDefinition> rowPool = rowDimensions.stream()
                .flatMap(d -> byDimension.get(d).stream())
                .collect(Collectors.toList());
            List<CategoryDefinition> colPool = colDimensions.stream()
                .flatMap(d -> byDimension.get(d).stream())
                .collect(Collectors.toList());

            if (rowPool.size() < GRID_SIZE || colPool.size() < GRID_SIZE) {
                continue; // this particular dimension split didn't leave enough categories, retry
            }

            Collections.shuffle(rowPool, random);
            Collections.shuffle(colPool, random);
            List<CategoryDefinition> rows = rowPool.subList(0, GRID_SIZE);
            List<CategoryDefinition> cols = colPool.subList(0, GRID_SIZE);

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

        return Optional.empty();
    }
}