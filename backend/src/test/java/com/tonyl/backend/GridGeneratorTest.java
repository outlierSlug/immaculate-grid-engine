package com.tonyl.backend;

import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.game.CategoryDefinition;
import com.tonyl.backend.game.GameModule;
import com.tonyl.backend.game.GenshinGameModule;
import com.tonyl.backend.puzzle.GridGenerator;
import com.tonyl.backend.game.BrawlStarsGameModule;
import com.tonyl.backend.game.ClashRoyaleGameModule;
import com.tonyl.backend.game.StarRailGameModule;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.io.InputStream;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

class GridGeneratorTest {

    private static final int DATES_TO_TEST = 365; // ~1 year of distinct seeds
    private static final int GRID_SIZE = 3;
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
            new Object[]{ new BrawlStarsGameModule(), loadEntities("brawlstars_entities.json") },
            new Object[]{ new ClashRoyaleGameModule(), loadEntities("clashroyale_entities.json") },
            new Object[]{ new StarRailGameModule(), loadEntities("starrail_entities.json") }
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

            // Invariant 3: the puzzle must be actually completable — some entity can
            // be the sole valid answer for more than one cell simultaneously (e.g. its
            // rarity matches one row and its model matches another, against the same
            // column), and since answers can't repeat across cells, every cell having
            // >=1 candidate is not sufficient. A full assignment of 9 distinct
            // entities to the 9 cells must exist (the "soft lock guard").
            assertTrue(hasPerfectMatching(puzzle.cellSolutions()),
                "Date " + date + ": puzzle accepted despite no possible full solution "
                + "(some entity is the only candidate for more than one cell) — soft lock guard failed");
        }

        // Invariant 4: a SINGLE seed's success rate should stay above a
        // per-game floor. This is deliberately checking generate()'s raw,
        // single-attempt reliability, not what a real player ever
        // experiences - PuzzleService.generateDailyPuzzle wraps every Daily
        // call in a retry-then-exhaustive-fallback safety net precisely
        // because a single seed isn't reliable enough on its own for a thin
        // category set (see PuzzleServiceGenerationTest, which verifies THAT
        // production-facing guarantee: 0 failures across 1000+ simulated
        // dates per game with the fallback in place). Brawl Stars' floor is
        // intentionally much lower than Genshin's: its 14 trait categories
        // include 8 with exactly one member and one with two (Movement),
        // same as rarity's Common/Ultra Legendary - legitimately, permanently
        // thin, not a bug (see CategoryChip.tsx's trait tooltips work and
        // GridGeneratorTest#characterFairnessReport, which measured this
        // directly). A regression below either floor still means investigate
        // - it just means "investigate for a NEW problem", not this one.
        double successRate = (double) successCount / DATES_TO_TEST;
        double floor = module.getGameId().equals("brawlstars") ? 0.5 : 0.9;
        assertTrue(successRate > floor,
            "Only " + successCount + "/" + DATES_TO_TEST + " dates produced a valid puzzle (" + (successRate * 100)
            + "%) for " + module.getGameId() + " — below the " + (floor * 100) + "% single-seed floor, investigate category thinness");
    }

    // Independent reference implementation of the bipartite matching check —
    // deliberately not calling GridGenerator's own (private) implementation,
    // so this test verifies the generator's actual output, not just that it
    // agrees with itself.
    private static boolean hasPerfectMatching(Map<String, List<String>> cellSolutions) {
        Map<String, String> entityToCell = new HashMap<>();
        for (String cellKey : cellSolutions.keySet()) {
            if (!tryAugment(cellKey, cellSolutions, entityToCell, new HashSet<>())) {
                return false;
            }
        }
        return true;
    }

    private static boolean tryAugment(
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

    // ── Statistical analysis: what kind of grids actually get generated? ──
    //
    // This is deliberately NOT a per-puzzle rule (no single puzzle is required
    // to span multiple dimensions — a same-dimension outcome is a legitimate
    // result of fair randomness). It measures an aggregate property of the
    // ALGORITHM across a large sample, and only fails if a dimension is
    // completely and systematically excluded, which would indicate sampling
    // bias, not natural data-driven variance.
    @Test
    void reportsDimensionDistributionAcrossManyGenerations() throws Exception {
        GameModule module = new GenshinGameModule();
        List<GridItem> entities = loadEntities("genshin_entities.json");
        List<CategoryDefinition> categories = module.getCategoryDefinitions(entities);

        int successCount = 0;
        int rowsMonoDimension = 0; // all 3 row categories drawn from a single dimension
        int colsMonoDimension = 0;
        Map<String, Integer> dimensionAppearances = new TreeMap<>();

        for (int i = 0; i < DATES_TO_TEST; i++) {
            LocalDate date = LocalDate.of(2026, 1, 1).plusDays(i);
            Optional<GridGenerator.GeneratedPuzzle> result = generator.generate(entities, categories, date);
            if (result.isEmpty()) continue;
            successCount++;

            GridGenerator.GeneratedPuzzle puzzle = result.get();
            Set<String> rowDims = puzzle.rowCategories().stream().map(CategoryDefinition::getDimension).collect(Collectors.toSet());
            Set<String> colDims = puzzle.colCategories().stream().map(CategoryDefinition::getDimension).collect(Collectors.toSet());

            if (rowDims.size() == 1) rowsMonoDimension++;
            if (colDims.size() == 1) colsMonoDimension++;

            for (CategoryDefinition cat : puzzle.rowCategories()) {
                dimensionAppearances.merge(cat.getDimension(), 1, Integer::sum);
            }
            for (CategoryDefinition cat : puzzle.colCategories()) {
                dimensionAppearances.merge(cat.getDimension(), 1, Integer::sum);
            }
        }

        int totalSlots = successCount * 2 * GRID_SIZE;
        System.out.println("=== Dimension distribution report (Genshin, " + successCount + "/" + DATES_TO_TEST + " successful) ===");
        System.out.printf("Rows entirely one dimension: %d/%d (%.1f%%)%n", rowsMonoDimension, successCount, 100.0 * rowsMonoDimension / successCount);
        System.out.printf("Cols entirely one dimension: %d/%d (%.1f%%)%n", colsMonoDimension, successCount, 100.0 * colsMonoDimension / successCount);
        System.out.println("Per-dimension share of all " + totalSlots + " row+col category slots:");
        for (var entry : dimensionAppearances.entrySet()) {
            System.out.printf("  %-18s %5d  (%.1f%%)%n", entry.getKey(), entry.getValue(), 100.0 * entry.getValue() / totalSlots);
        }

        // Regression guard against the original pooling bias reappearing (where
        // large dimensions dominated so heavily that "all 3 rows one dimension"
        // was the common case, not the exception). The measured rate with fair
        // sampling is ~30-37%; 60% gives generous headroom for legitimate
        // sample-to-sample variance while still catching a real reintroduced bias.
        assertTrue(rowsMonoDimension < successCount * 0.6,
            "Rows were entirely one dimension in " + rowsMonoDimension + "/" + successCount
            + " puzzles (" + (100.0 * rowsMonoDimension / successCount) + "%) — investigate for reintroduced pooling bias");
        assertTrue(colsMonoDimension < successCount * 0.6,
            "Cols were entirely one dimension in " + colsMonoDimension + "/" + successCount
            + " puzzles (" + (100.0 * colsMonoDimension / successCount) + "%) — investigate for reintroduced pooling bias");

        Set<String> dimensionsWithEnoughCategories = categories.stream()
            .collect(Collectors.groupingBy(CategoryDefinition::getDimension, Collectors.counting()))
            .entrySet().stream()
            .filter(e -> e.getValue() >= GRID_SIZE)
            .map(Map.Entry::getKey)
            .collect(Collectors.toSet());

        for (String dim : dimensionsWithEnoughCategories) {
            assertTrue(dimensionAppearances.getOrDefault(dim, 0) > 0,
                "Dimension '" + dim + "' never appeared across " + successCount + " generated puzzles — "
                + "sampling may be systematically excluding it, not just naturally deprioritizing it");
        }
    }

    // Exploring the full attempt budget (rather than returning at the first
    // valid candidate) means generation always does MAX_ATTEMPTS worth of
    // work, not just "however many attempts it took to get lucky". Guards
    // against that becoming slow enough to make Unlimited mode's Generate
    // button feel unresponsive.
    @Test
    void generationStaysFastEnoughForInteractiveUse() throws Exception {
        GameModule module = new GenshinGameModule();
        List<GridItem> entities = loadEntities("genshin_entities.json");
        List<CategoryDefinition> categories = module.getCategoryDefinitions(entities);

        int sampleSize = 50;
        long start = System.nanoTime();
        for (int i = 0; i < sampleSize; i++) {
            generator.generate(entities, categories, LocalDate.of(2026, 1, 1).plusDays(i));
        }
        double avgMs = (System.nanoTime() - start) / 1_000_000.0 / sampleSize;

        System.out.printf("Average generation time: %.1fms over %d generations%n", avgMs, sampleSize);

        assertTrue(avgMs < 200,
            "Average generation time " + avgMs + "ms exceeds the interactive-use budget — "
            + "MAX_ATTEMPTS or a per-attempt cost may have grown");
    }

    // ── Ad-hoc baseline characterization (not a regression test — just a
    // large-sample report to inform tuning a probabilistic mono-dimension
    // rejection on top of the current baseline algorithm). ──
    @Test
    void adHocBaselineDistributionReport() throws Exception {
        GameModule module = new GenshinGameModule();
        List<GridItem> entities = loadEntities("genshin_entities.json");
        List<CategoryDefinition> allCategories = module.getCategoryDefinitions(entities);

        runDistributionReport("PHASE 1 BASELINE: first-valid-candidate (current production behavior)", entities, allCategories,
            seed -> generator.generate(entities, allCategories, seed, 1, true));

        // Phase 1 candidate-pool: collect up to 20 valid candidates per seed within
        // the same MAX_ATTEMPTS budget, then pick uniformly at random among them —
        // no scoring yet (that's Phase 2+), this isolates the effect of the pool
        // itself vs. always taking whatever the proposal step finds first.
        Random pickRandom = new Random(42);
        runDistributionReport("PHASE 1 CANDIDATE POOL: uniform-random pick among up to 20 valid candidates", entities, allCategories,
            seed -> {
                List<GridGenerator.GeneratedPuzzle> candidates = generator.generateCandidates(entities, allCategories, seed, 1, true, 20);
                return candidates.isEmpty() ? Optional.empty() : Optional.of(candidates.get(pickRandom.nextInt(candidates.size())));
            });
    }

    private void runDistributionReport(
        String scenarioLabel,
        List<GridItem> entities,
        List<CategoryDefinition> categories,
        java.util.function.LongFunction<Optional<GridGenerator.GeneratedPuzzle>> puzzleForSeed
    ) {
        int sampleSize = 2000;
        int successCount = 0;
        int rowsMono = 0, colsMono = 0, eitherMono = 0;
        Map<String, Integer> dimensionGridAppearances = new TreeMap<>(); // grids where dim appears >=1 time (row or col)
        Map<String, Integer> categoryGridAppearances = new TreeMap<>(); // grids where this exact category appears
        int totalDistinctDimensionsUsed = 0;

        for (long seed = 0; seed < sampleSize; seed++) {
            Optional<GridGenerator.GeneratedPuzzle> result = puzzleForSeed.apply(seed);
            if (result.isEmpty()) continue;
            successCount++;

            GridGenerator.GeneratedPuzzle puzzle = result.get();
            Set<String> rowDims = puzzle.rowCategories().stream().map(CategoryDefinition::getDimension).collect(Collectors.toSet());
            Set<String> colDims = puzzle.colCategories().stream().map(CategoryDefinition::getDimension).collect(Collectors.toSet());
            boolean rowMonoThis = rowDims.size() == 1;
            boolean colMonoThis = colDims.size() == 1;
            if (rowMonoThis) rowsMono++;
            if (colMonoThis) colsMono++;
            if (rowMonoThis || colMonoThis) eitherMono++;

            Set<String> gridDims = new HashSet<>(rowDims);
            gridDims.addAll(colDims);
            totalDistinctDimensionsUsed += gridDims.size();
            for (String dim : gridDims) {
                dimensionGridAppearances.merge(dim, 1, Integer::sum);
            }

            Set<String> gridCats = new HashSet<>();
            puzzle.rowCategories().forEach(c -> gridCats.add(c.getLabel()));
            puzzle.colCategories().forEach(c -> gridCats.add(c.getLabel()));
            for (String cat : gridCats) {
                categoryGridAppearances.merge(cat, 1, Integer::sum);
            }
        }

        System.out.println();
        System.out.println("=== " + scenarioLabel + " (Genshin, " + successCount + "/" + sampleSize + " successful) ===");
        System.out.println();
        System.out.println("-- Dimension appearance rate (% of grids where dimension appears >=1 as row or col axis) --");
        for (var entry : dimensionGridAppearances.entrySet()) {
            System.out.printf("  %-18s %5d / %5d  (%.1f%%)%n", entry.getKey(), entry.getValue(), successCount, 100.0 * entry.getValue() / successCount);
        }
        System.out.println();
        System.out.println("-- Monodimensional rate --");
        System.out.printf("  Rows mono:        %5d / %5d  (%.1f%%)%n", rowsMono, successCount, 100.0 * rowsMono / successCount);
        System.out.printf("  Cols mono:        %5d / %5d  (%.1f%%)%n", colsMono, successCount, 100.0 * colsMono / successCount);
        System.out.printf("  Either side mono: %5d / %5d  (%.1f%%)%n", eitherMono, successCount, 100.0 * eitherMono / successCount);
        System.out.println();
        System.out.printf("-- Avg distinct dimensions used per grid: %.2f (out of 6 total categories, max 2 since rows/cols split into exactly 2 groups) --%n",
            (double) totalDistinctDimensionsUsed / successCount);
        System.out.println();
        System.out.println("-- Top individual categories by grid-appearance rate --");
        int finalSuccessCount = successCount;
        categoryGridAppearances.entrySet().stream()
            .sorted((a, b) -> b.getValue() - a.getValue())
            .forEach(entry -> System.out.printf("  %-28s %5d / %5d  (%.1f%%)%n", entry.getKey(), entry.getValue(), finalSuccessCount, 100.0 * entry.getValue() / finalSuccessCount));

        assertTrue(successCount > 0); // sanity only — this test is a report, not a gate
    }

    // ── Ad-hoc: benchmark findAllValidGrids (the exhaustive narrow-filter
    // fallback) against the scenarios known from manual analysis to be the
    // hardest cases for the randomized search: a single thin dimension
    // (release_version, ~51 categories but most have very few matching
    // entities) paired with just one other dimension. Confirms it finds the
    // same valid-grid counts as manual brute-force analysis, and does so fast
    // enough to run synchronously as a fallback after the fast path fails. ──
    @Test
    void adHocExhaustiveFallbackBenchmark() throws Exception {
        GameModule module = new GenshinGameModule();
        List<GridItem> entities = loadEntities("genshin_entities.json");
        List<CategoryDefinition> allCategories = module.getCategoryDefinitions(entities);

        benchmarkExhaustiveFallback("model x release_version, minAnswersPerCell=1", entities, allCategories, 1, "model", "release_version");
        benchmarkExhaustiveFallback("model x release_version, minAnswersPerCell=2", entities, allCategories, 2, "model", "release_version");
        benchmarkExhaustiveFallback("rarity x release_version, minAnswersPerCell=1", entities, allCategories, 1, "rarity", "release_version");
        benchmarkExhaustiveFallback("element x release_version, minAnswersPerCell=1", entities, allCategories, 1, "element", "release_version");
        benchmarkExhaustiveFallback("element x release_version, minAnswersPerCell=2", entities, allCategories, 2, "element", "release_version");
        benchmarkExhaustiveFallback("element x model x release_version, minAnswersPerCell=1", entities, allCategories, 1, "element", "model", "release_version");
    }

    private void benchmarkExhaustiveFallback(
        String label, List<GridItem> entities, List<CategoryDefinition> allCategories,
        int minAnswersPerCell, String... dims
    ) {
        List<CategoryDefinition> filtered = allCategories.stream()
            .filter(c -> Arrays.asList(dims).contains(c.getDimension()))
            .toList();

        long start = System.nanoTime();
        List<GridGenerator.GeneratedPuzzle> found = generator.findAllValidGrids(
            entities, filtered, minAnswersPerCell, true, 500, 6_000_000L);
        double elapsedMs = (System.nanoTime() - start) / 1_000_000.0;

        System.out.printf("%-55s validGridsFound=%4d (capped at 500) elapsed=%.0fms%n", label, found.size(), elapsedMs);
    }

    // ── Ad-hoc: character-fairness analysis for the account "collection"
    // feature idea (see project memory character_collection_feature_idea.md) —
    // simulates SAMPLE_DAYS worth of real Daily generation (same seed
    // derivation, same requireSoftLockGuard=true as production) to answer
    // "which characters can Daily's generator even produce as a valid answer,
    // and how often?" A character's true collectibility ceiling is whether it
    // ever appears in ANY cell's solution list, not just the one a real
    // player happened to pick - the actual player pick is unknowable from
    // generation alone, but eligibility is exactly what this measures.
    // Deliberately not a regression gate (only a sanity assertion at the
    // bottom) - this is a report to read, not a pass/fail check.
    @ParameterizedTest
    @MethodSource("gameModules")
    void characterFairnessReport(GameModule module, List<GridItem> entities) throws Exception {
        List<CategoryDefinition> categories = module.getCategoryDefinitions(entities);
        int sampleDays = 3650; // ~10 years of Daily puzzles
        LocalDate start = LocalDate.of(2026, 1, 1);

        Map<String, Integer> appearanceCount = new LinkedHashMap<>();
        Map<String, Integer> daysSinceLastSeen = new HashMap<>();
        Map<String, Integer> maxDrought = new HashMap<>();
        Map<String, String> displayNameById = new HashMap<>();
        for (GridItem e : entities) {
            appearanceCount.put(e.getId(), 0);
            daysSinceLastSeen.put(e.getId(), 0);
            maxDrought.put(e.getId(), 0);
            displayNameById.put(e.getId(), e.getDisplayName());
        }

        int successCount = 0;
        long totalCellDepth = 0;
        int totalCells = 0;

        for (int i = 0; i < sampleDays; i++) {
            LocalDate date = start.plusDays(i);
            Optional<GridGenerator.GeneratedPuzzle> result = generator.generate(entities, categories, date);

            Set<String> eligibleToday = new HashSet<>();
            if (result.isPresent()) {
                successCount++;
                GridGenerator.GeneratedPuzzle puzzle = result.get();
                for (List<String> solutions : puzzle.cellSolutions().values()) {
                    totalCellDepth += solutions.size();
                    totalCells++;
                    eligibleToday.addAll(solutions);
                }
            }

            // Every entity gets touched every day - either its streak resets
            // (appeared today) or extends (didn't), including on a failed
            // generation day, where nobody was eligible.
            for (String id : appearanceCount.keySet()) {
                if (eligibleToday.contains(id)) {
                    appearanceCount.merge(id, 1, Integer::sum);
                    daysSinceLastSeen.put(id, 0);
                } else {
                    int updated = daysSinceLastSeen.merge(id, 1, Integer::sum);
                    maxDrought.merge(id, updated, Math::max);
                }
            }
        }

        List<String> ids = new ArrayList<>(appearanceCount.keySet());
        int rosterSize = ids.size();
        long everAppeared = ids.stream().filter(id -> appearanceCount.get(id) > 0).count();
        double coveragePct = 100.0 * everAppeared / rosterSize;

        List<Integer> countsAscending = ids.stream().map(appearanceCount::get).sorted().toList();
        double gini = computeGini(countsAscending);
        double meanCellDepth = totalCells == 0 ? 0 : (double) totalCellDepth / totalCells;
        double meanAppearances = countsAscending.stream().mapToInt(Integer::intValue).average().orElse(0);
        int minAppearances = countsAscending.get(0);
        int medianAppearances = countsAscending.get(countsAscending.size() / 2);
        int maxAppearances = countsAscending.get(countsAscending.size() - 1);

        String gameLabel = module.getGameId();
        System.out.println();
        System.out.println("=== Character fairness report (" + gameLabel + ", " + successCount + "/" + sampleDays
            + " days generated, roster=" + rosterSize + ") ===");
        System.out.printf("Coverage: %d/%d characters (%.1f%%) were a valid answer at least once%n", everAppeared, rosterSize, coveragePct);
        System.out.printf("Gini coefficient (appearance-frequency inequality, 0=perfectly even, 1=maximally unequal): %.3f%n", gini);
        System.out.printf("Mean cell depth (avg valid-answer count per cell): %.2f%n", meanCellDepth);
        System.out.printf("Appearances per character over %d days: min=%d, mean=%.1f, median=%d, max=%d%n",
            sampleDays, minAppearances, meanAppearances, medianAppearances, maxAppearances);
        System.out.printf("Generation success rate: %d/%d (%.1f%%)%n", successCount, sampleDays, 100.0 * successCount / sampleDays);

        List<String> neverAppeared = ids.stream().filter(id -> appearanceCount.get(id) == 0).sorted().toList();
        System.out.println("Characters that NEVER appeared as a valid answer (" + neverAppeared.size() + "):");
        neverAppeared.forEach(id -> System.out.println("  - " + displayNameById.get(id)));

        System.out.println("10 rarest characters that DID appear at least once (by appearance count):");
        ids.stream()
            .filter(id -> appearanceCount.get(id) > 0)
            .sorted(Comparator.comparingInt(appearanceCount::get))
            .limit(10)
            .forEach(id -> System.out.printf("  %-30s %5d appearances, max drought %4d days%n",
                displayNameById.get(id), appearanceCount.get(id), maxDrought.get(id)));

        System.out.println("10 most frequent characters:");
        ids.stream()
            .sorted(Comparator.comparingInt(appearanceCount::get).reversed())
            .limit(10)
            .forEach(id -> System.out.printf("  %-30s %5d appearances%n", displayNameById.get(id), appearanceCount.get(id)));

        String worstDroughtId = ids.stream().max(Comparator.comparingInt(maxDrought::get)).orElse(null);
        int overallMaxDrought = worstDroughtId == null ? 0 : maxDrought.get(worstDroughtId);
        System.out.printf("Longest single drought: %d consecutive days (%s)%n",
            overallMaxDrought, worstDroughtId != null ? displayNameById.get(worstDroughtId) : "n/a");

        // Full per-character breakdown, for follow-up analysis beyond what
        // fits in a console report. target/ - not a hardcoded machine-
        // specific path - so this runs on any machine/CI, not just the one
        // it happened to be written on; already .gitignore'd as a build
        // output directory.
        Path outDir = Path.of("target", "fairness-reports");
        Files.createDirectories(outDir);
        Path csvPath = outDir.resolve(gameLabel + "_fairness_report.csv");
        try (PrintWriter writer = new PrintWriter(Files.newBufferedWriter(csvPath))) {
            writer.println("id,display_name,appearances,appearance_rate_pct,max_drought_days");
            for (String id : ids.stream().sorted(Comparator.comparingInt(appearanceCount::get)).toList()) {
                writer.printf("%s,%s,%d,%.2f,%d%n", id, displayNameById.get(id), appearanceCount.get(id),
                    100.0 * appearanceCount.get(id) / sampleDays, maxDrought.get(id));
            }
        }
        System.out.println("Full per-character data written to " + csvPath);

        assertTrue(successCount > 0); // sanity only — this test is a report, not a gate
    }

    private static double computeGini(List<Integer> valuesSortedAscending) {
        int n = valuesSortedAscending.size();
        long sum = valuesSortedAscending.stream().mapToLong(Integer::longValue).sum();
        if (sum == 0) return 0.0;
        double weightedSum = 0;
        for (int i = 0; i < n; i++) {
            weightedSum += (i + 1L) * valuesSortedAscending.get(i);
        }
        return (2.0 * weightedSum) / (n * (double) sum) - (n + 1.0) / n;
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