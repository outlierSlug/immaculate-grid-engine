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
        // Soft lock guard is non-negotiable for Daily: a puzzle a player can
        // only get one shot at must always be fully completable.
        return generate(entities, categories, date.toEpochDay(), 1, true);
    }

    /**
     * Seed- and threshold-based variant used by Unlimited mode: any long seed
     * (not just a date) can drive generation, minAnswersPerCell raises the
     * per-cell floor above the default of 1 (e.g. to exclude cells with only a
     * single valid answer), and requireSoftLockGuard controls whether a
     * candidate combination must admit a full 9-cell solution (see
     * {@link #hasPerfectMatching}).
     */
    public Optional<GeneratedPuzzle> generate(
        List<GridItem> entities,
        List<CategoryDefinition> categories,
        long seed,
        int minAnswersPerCell,
        boolean requireSoftLockGuard
    ) {
        List<GeneratedPuzzle> found = searchAttempts(entities, categories, seed, minAnswersPerCell, requireSoftLockGuard, 1);
        return found.isEmpty() ? Optional.empty() : Optional.of(found.get(0));
    }

    /**
     * Same correctness engine as {@link #generate}, but keeps searching instead of
     * stopping at the first valid candidate, collecting up to maxCandidates valid
     * grids (still bounded by the same MAX_ATTEMPTS search budget). This is the
     * hook a caller uses to choose among several valid grids — e.g. Unlimited mode
     * picking for dimension variety, or Daily picking for freshness — rather than
     * always taking whatever the proposal step happens to find first. Scoring and
     * selection are deliberately NOT done here: this only ever returns candidates
     * that already passed every correctness check generate() would apply.
     */
    public List<GeneratedPuzzle> generateCandidates(
        List<GridItem> entities,
        List<CategoryDefinition> categories,
        long seed,
        int minAnswersPerCell,
        boolean requireSoftLockGuard,
        int maxCandidates
    ) {
        return searchAttempts(entities, categories, seed, minAnswersPerCell, requireSoftLockGuard, maxCandidates);
    }

    private List<GeneratedPuzzle> searchAttempts(
        List<GridItem> entities,
        List<CategoryDefinition> categories,
        long seed,
        int minAnswersPerCell,
        boolean requireSoftLockGuard,
        int maxCandidates
    ) {
        List<GeneratedPuzzle> candidates = new ArrayList<>();

        Map<String, List<CategoryDefinition>> byDimension = categories.stream()
            .collect(Collectors.groupingBy(CategoryDefinition::getDimension));

        List<String> dimensions = new ArrayList<>(byDimension.keySet());
        if (dimensions.size() < 2) {
            return candidates; // need at least 2 dimensions to split rows/cols safely
        }

        Random random = new Random(seed);

        for (int attempt = 0; attempt < MAX_ATTEMPTS && candidates.size() < maxCandidates; attempt++) {
            Collections.shuffle(dimensions, random);

            // Split dimensions into two non-empty groups: one feeds rows, the other feeds
            // columns. This guarantees no row category and column category ever share a
            // dimension, which would otherwise make that cell impossible to fill (e.g.
            // rarity==Legendary AND rarity==Epic can never both be true for one entity).
            // The split point is weighted toward more balanced groups (see
            // pickBalancedSplitPoint) rather than picked uniformly, since a uniform pick
            // leaves one side with only a single dimension surprisingly often.
            int splitPoint = pickBalancedSplitPoint(dimensions.size(), random);
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

            // Soft rejection of monodimensional sides: the baseline proposal above is
            // unchanged, but a side that came out all-one-dimension gets a chance to be
            // discarded and re-rolled. The keep probability adapts to how many distinct
            // dimensions were actually available on that side after the split — if the
            // split only left one dimension for this side, mono was the ONLY possible
            // outcome and must be kept; the more dimensions were available, the more a
            // mono result looks like bad luck worth rerolling rather than a forced case.
            if (isRejectedForMono(rows, rowDimensions.size(), random)
                || isRejectedForMono(cols, colDimensions.size(), random)) {
                continue;
            }

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

                    if (matches.size() < minAnswersPerCell) {
                        valid = false;
                        break outer;
                    }
                    solutions.put(r + "-" + c, matches);
                }
            }

            // Every cell individually having >=1 valid answer isn't enough: a single
            // entity can be the sole valid answer for multiple cells at once (e.g. a
            // character whose rarity matches one row AND whose model matches another
            // row, paired with the same column) — answers can't repeat across cells,
            // so that entity can only fill one of them. This checks that a full
            // assignment of 9 distinct entities to the 9 cells actually exists.
            if (valid && requireSoftLockGuard && !hasPerfectMatching(solutions)) {
                valid = false;
            }

            if (valid) {
                candidates.add(new GeneratedPuzzle(rows, cols, solutions));
            }
        }

        return candidates;
    }

    /**
     * Exhaustively checks every possible row/col category combination across
     * every way to split the given dimensions into two groups, returning up to
     * maxCandidates valid grids. Unlike generate()/generateCandidates() (which
     * sample randomly and can miss a valid grid that's just statistically rare
     * to stumble into — e.g. a single thin dimension like release_version
     * paired with one other dimension can have only a handful of valid 3x3
     * combinations out of hundreds of thousands), this is guaranteed to find
     * one if and only if one exists for this exact category set. Only
     * tractable for small filtered category sets: the search space grows
     * combinatorially, so this is meant as a last-resort fallback after the
     * fast randomized search fails under a narrow Unlimited-mode filter, not
     * a general replacement. comboBudget bounds the combinations checked
     * PER dimension-split (not summed across all of them) — one expensive
     * split (e.g. a thin dimension paired against everything else combined)
     * is skipped on its own rather than aborting cheaper splits that could
     * still turn up a valid grid.
     */
    public List<GeneratedPuzzle> findAllValidGrids(
        List<GridItem> entities,
        List<CategoryDefinition> categories,
        int minAnswersPerCell,
        boolean requireSoftLockGuard,
        int maxCandidates,
        long comboBudget
    ) {
        List<GeneratedPuzzle> candidates = new ArrayList<>();

        Map<String, List<CategoryDefinition>> byDimension = categories.stream()
            .collect(Collectors.groupingBy(CategoryDefinition::getDimension));
        List<String> dimensions = new ArrayList<>(byDimension.keySet());
        if (dimensions.size() < 2) {
            return candidates;
        }

        List<List<String>> dimensionSplits = dimensionBipartitions(dimensions);

        // Per-category match lists computed once and reused across every combination
        // checked below, instead of re-scanning all entities for every cell of every
        // candidate grid — this is what keeps exhaustively checking hundreds of
        // thousands of combinations fast enough to run synchronously. Order-preserving
        // (built from `entities` in its original order) so results match what the
        // randomized search would have produced for the same category pairing.
        Map<CategoryDefinition, List<String>> matchesByCategory = categories.stream()
            .collect(Collectors.toMap(cat -> cat, cat -> entities.stream()
                .filter(cat::matches)
                .map(GridItem::getId)
                .toList()));

        for (List<String> sideA : dimensionSplits) {
            if (candidates.size() >= maxCandidates) {
                break;
            }
            List<String> sideB = dimensions.stream().filter(d -> !sideA.contains(d)).toList();
            List<CategoryDefinition> poolA = sideA.stream().flatMap(d -> byDimension.get(d).stream()).toList();
            List<CategoryDefinition> poolB = sideB.stream().flatMap(d -> byDimension.get(d).stream()).toList();
            if (poolA.size() < GRID_SIZE || poolB.size() < GRID_SIZE) {
                continue;
            }
            if (countThreeCombinations(poolA.size()) * countThreeCombinations(poolB.size()) > comboBudget) {
                continue; // this split alone is too large to check exhaustively - skip it, try others
            }

            for (List<CategoryDefinition> rows : threeCombinations(poolA)) {
                if (candidates.size() >= maxCandidates) {
                    break;
                }
                for (List<CategoryDefinition> cols : threeCombinations(poolB)) {
                    Map<String, List<String>> solutions = new LinkedHashMap<>();
                    boolean valid = true;

                    outer:
                    for (int r = 0; r < GRID_SIZE; r++) {
                        for (int c = 0; c < GRID_SIZE; c++) {
                            List<String> rowIds = matchesByCategory.get(rows.get(r));
                            List<String> colIds = matchesByCategory.get(cols.get(c));
                            List<String> matches = rowIds.size() <= colIds.size()
                                ? rowIds.stream().filter(colIds::contains).toList()
                                : colIds.stream().filter(rowIds::contains).toList();

                            if (matches.size() < minAnswersPerCell) {
                                valid = false;
                                break outer;
                            }
                            solutions.put(r + "-" + c, matches);
                        }
                    }

                    if (valid && requireSoftLockGuard && !hasPerfectMatching(solutions)) {
                        valid = false;
                    }

                    if (valid) {
                        candidates.add(new GeneratedPuzzle(rows, cols, solutions));
                        if (candidates.size() >= maxCandidates) {
                            break;
                        }
                    }
                }
            }
        }

        return candidates;
    }

    /** Every way to split dimensions into two non-empty groups, each represented once (not once per side). */
    private List<List<String>> dimensionBipartitions(List<String> dimensions) {
        int n = dimensions.size();
        List<List<String>> partitions = new ArrayList<>();
        for (int mask = 0; mask < (1 << (n - 1)); mask++) {
            List<String> sideA = new ArrayList<>();
            sideA.add(dimensions.get(0));
            for (int i = 1; i < n; i++) {
                if ((mask & (1 << (i - 1))) != 0) {
                    sideA.add(dimensions.get(i));
                }
            }
            if (sideA.size() < n) {
                partitions.add(sideA);
            }
        }
        return partitions;
    }

    private long countThreeCombinations(long n) {
        return n < GRID_SIZE ? 0 : n * (n - 1) * (n - 2) / 6;
    }

    private List<List<CategoryDefinition>> threeCombinations(List<CategoryDefinition> items) {
        List<List<CategoryDefinition>> result = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            for (int j = i + 1; j < items.size(); j++) {
                for (int k = j + 1; k < items.size(); k++) {
                    result.add(List.of(items.get(i), items.get(j), items.get(k)));
                }
            }
        }
        return result;
    }

    /**
     * Chooses where to divide the shuffled dimension list into a row-group and a
     * col-group, weighted toward more balanced splits (e.g. 3-vs-3 over 1-vs-5)
     * via weight(splitPoint) = min(splitPoint, dimensionCount - splitPoint). A
     * uniform pick left a side with just one dimension 40% of the time on a
     * 6-dimension set, which forces that side monodimensional regardless of any
     * post-hoc rejection since there's nothing else to draw from. This doesn't
     * forbid lopsided splits — it just makes them less likely when a more
     * balanced option exists, and falls back toward uniform automatically as
     * the dimension count shrinks (e.g. with 3 dimensions, every split leaves a
     * 1-vs-2 group and the weights end up equal).
     */
    private int pickBalancedSplitPoint(int dimensionCount, Random random) {
        double[] weights = new double[dimensionCount]; // index 0 unused; valid range is 1..dimensionCount-1
        double totalWeight = 0;
        for (int splitPoint = 1; splitPoint < dimensionCount; splitPoint++) {
            double balance = Math.min(splitPoint, dimensionCount - splitPoint);
            weights[splitPoint] = balance;
            totalWeight += balance;
        }

        double roll = random.nextDouble() * totalWeight;
        double cumulative = 0;
        for (int splitPoint = 1; splitPoint < dimensionCount; splitPoint++) {
            cumulative += weights[splitPoint];
            if (roll < cumulative) {
                return splitPoint;
            }
        }
        return dimensionCount - 1; // floating-point rounding fallback
    }

    /**
     * True if this side is monodimensional AND a random roll says to discard it.
     * The keep probability depends on dimsAvailableOnSide (how many distinct
     * dimensions fed this side's pool after the row/col split) rather than a
     * fixed constant, so the penalty naturally weakens as Unlimited-mode
     * filters shrink the available dimension set toward 1 (where mono is the
     * only possible outcome and must never be rejected).
     */
    private boolean isRejectedForMono(List<CategoryDefinition> side, int dimsAvailableOnSide, Random random) {
        boolean mono = side.stream().map(CategoryDefinition::getDimension).distinct().count() == 1;
        if (!mono) {
            return false;
        }

        double keepProb;
        if (dimsAvailableOnSide <= 1) {
            keepProb = 1.0; // forced mono - always keep
        } else if (dimsAvailableOnSide == 2) {
            keepProb = 0.20; // mild penalty
        } else {
            keepProb = 0.05; // stronger penalty when more choice existed
        }

        return random.nextDouble() > keepProb;
    }

    /**
     * Bipartite maximum-matching check (Kuhn's algorithm / augmenting paths):
     * can every cell be assigned a distinct entity from its own candidate list?
     * Cheap at this scale (9 cells, a handful of candidates each), so run to
     * completion rather than approximating.
     * <p>
     * Package-private (not private) so AdminPuzzleService can call it
     * directly against a hand-built manual grid — same convention as
     * PuzzleService.generateDailyPuzzle: no Spring wiring needed to reuse it
     * from within this package.
     */
    boolean hasPerfectMatching(Map<String, List<String>> cellSolutions) {
        Map<String, String> entityToCell = new HashMap<>();
        for (String cellKey : cellSolutions.keySet()) {
            if (!tryAugment(cellKey, cellSolutions, entityToCell, new HashSet<>())) {
                return false;
            }
        }
        return true;
    }

    private boolean tryAugment(
        String cellKey,
        Map<String, List<String>> cellSolutions,
        Map<String, String> entityToCell,
        Set<String> visitedEntities
    ) {
        for (String entityId : cellSolutions.get(cellKey)) {
            if (!visitedEntities.add(entityId)) {
                continue;
            }
            String currentOwner = entityToCell.get(entityId);
            if (currentOwner == null || tryAugment(currentOwner, cellSolutions, entityToCell, visitedEntities)) {
                entityToCell.put(entityId, cellKey);
                return true;
            }
        }
        return false;
    }
}
