package com.tonyl.backend.puzzle;

import com.tonyl.backend.api.CellAnswerStat;
import com.tonyl.backend.api.CellStatsResponse;
import com.tonyl.backend.api.PuzzleStatsResponse;
import com.tonyl.backend.api.SubmitAttemptRequest;
import com.tonyl.backend.api.YourStats;
import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.domain.PuzzleAttempt;
import com.tonyl.backend.domain.PuzzleMode;
import com.tonyl.backend.repository.GridItemRepository;
import com.tonyl.backend.repository.PuzzleAttemptRepository;
import com.tonyl.backend.repository.PuzzleRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

// Owns everything built on top of PuzzleAttempt: recording a finished game
// once, and computing every rarity/uniqueness number live from the current
// table contents on every read. Nothing here is cached or precomputed -
// intentional, see docs/ARCHITECTURE.md's Phase 6 notes.
@Service
public class PuzzleStatsService {

    // Grid is always 3x3 today, so a "solved" score maxes out at 9 - used
    // purely to zero-fill the score distribution's range, not a rule enforced
    // anywhere else.
    private static final int MAX_SCORE = 9;
    private static final int UNIQUENESS_CEILING = 900;

    private final PuzzleAttemptRepository puzzleAttemptRepository;
    private final PuzzleRepository puzzleRepository;
    private final GridItemRepository gridItemRepository;

    public PuzzleStatsService(PuzzleAttemptRepository puzzleAttemptRepository, PuzzleRepository puzzleRepository,
                               GridItemRepository gridItemRepository) {
        this.puzzleAttemptRepository = puzzleAttemptRepository;
        this.puzzleRepository = puzzleRepository;
        this.gridItemRepository = gridItemRepository;
    }

    public void submitAttempt(String puzzleId, SubmitAttemptRequest request) {
        Puzzle puzzle = puzzleRepository.findById(puzzleId)
            .orElseThrow(() -> new NoSuchElementException("No puzzle found with id " + puzzleId));

        // Unlimited puzzles are ephemeral UUIDs never replayed by anyone else,
        // so "stats for this puzzle" is meaningless - silently ignore rather
        // than make every caller special-case it.
        if (puzzle.getMode() != PuzzleMode.DAILY) {
            return;
        }

        if (puzzleAttemptRepository.findByPuzzleIdAndSessionId(puzzleId, request.sessionId()).isPresent()) {
            return;
        }

        PuzzleAttempt attempt = new PuzzleAttempt(
            puzzleId,
            request.sessionId(),
            request.cellAnswers(),
            request.score(),
            request.guessesUsed(),
            request.solved(),
            request.gaveUp(),
            request.elapsedMs(),
            Instant.now()
        );
        try {
            puzzleAttemptRepository.save(attempt);
        } catch (DataIntegrityViolationException e) {
            // Two near-simultaneous submissions (double tab, fast refresh)
            // raced past the findByPuzzleIdAndSessionId check above - the
            // unique constraint caught it, so the first writer wins and this
            // one is a harmless no-op.
        }
    }

    public PuzzleStatsResponse getStats(String puzzleId, String sessionId) {
        List<PuzzleAttempt> attempts = puzzleAttemptRepository.findByPuzzleId(puzzleId);
        long gamesPlayed = attempts.size();
        double avgScore = attempts.stream().mapToInt(PuzzleAttempt::getScore).average().orElse(0);

        Map<String, CellStatsResponse> perCell = buildPerCellStats(attempts, gamesPlayed);
        Map<Long, Integer> liveScoreByAttemptId = computeLiveUniquenessScores(attempts, perCell);

        Map<String, Long> scoreDistribution = buildScoreDistribution(attempts);
        Integer mostUniqueScore = liveScoreByAttemptId.values().stream().min(Integer::compareTo).orElse(null);
        List<Integer> uniquenessScores = List.copyOf(liveScoreByAttemptId.values());
        YourStats you = buildYourStats(attempts, sessionId);

        return new PuzzleStatsResponse(gamesPlayed, avgScore, mostUniqueScore, scoreDistribution, perCell,
            uniquenessScores, you);
    }

    private Map<String, CellStatsResponse> buildPerCellStats(List<PuzzleAttempt> attempts, long gamesPlayed) {
        // cellKey -> itemId -> how many attempts answered that cell with that item
        Map<String, Map<String, Long>> cellItemCounts = new HashMap<>();
        for (PuzzleAttempt attempt : attempts) {
            for (Map.Entry<String, String> entry : attempt.getCellAnswers().entrySet()) {
                cellItemCounts
                    .computeIfAbsent(entry.getKey(), k -> new HashMap<>())
                    .merge(entry.getValue(), 1L, Long::sum);
            }
        }

        Set<String> allItemIds = cellItemCounts.values().stream()
            .flatMap(counts -> counts.keySet().stream())
            .collect(Collectors.toSet());
        Map<String, GridItem> itemsById = allItemIds.isEmpty()
            ? Map.of()
            : gridItemRepository.findAllById(allItemIds).stream()
                .collect(Collectors.toMap(GridItem::getId, Function.identity()));

        Map<String, CellStatsResponse> perCell = new HashMap<>();
        cellItemCounts.forEach((cellKey, counts) -> {
            long correctAttempts = counts.values().stream().mapToLong(Long::longValue).sum();
            List<CellAnswerStat> answers = counts.entrySet().stream()
                .map(entry -> {
                    GridItem item = itemsById.get(entry.getKey());
                    double percent = correctAttempts > 0 ? entry.getValue() * 100.0 / correctAttempts : 0;
                    return new CellAnswerStat(
                        entry.getKey(),
                        item != null ? item.getDisplayName() : entry.getKey(),
                        item != null ? item.getImageUrl() : null,
                        entry.getValue(),
                        percent
                    );
                })
                .sorted(Comparator.comparingLong(CellAnswerStat::count).reversed())
                .toList();
            perCell.put(cellKey, new CellStatsResponse(gamesPlayed, correctAttempts, answers));
        });
        return perCell;
    }

    // UNIQ = 900 - sum((100 - percentChosen) over correctly-filled cells).
    // Unfilled cells contribute no deduction, so they implicitly cost the
    // full 100 - matches PuzzleAttempt's design note on why blanks aren't
    // special-cased separately.
    private Map<Long, Integer> computeLiveUniquenessScores(List<PuzzleAttempt> attempts,
                                                             Map<String, CellStatsResponse> perCell) {
        Map<String, Double> percentByKey = new HashMap<>(); // "cellKey|itemId" -> percent
        perCell.forEach((cellKey, stats) ->
            stats.answers().forEach(answer -> percentByKey.put(cellKey + "|" + answer.itemId(), answer.percent())));

        Map<Long, Integer> scores = new HashMap<>();
        for (PuzzleAttempt attempt : attempts) {
            double deduction = 0;
            for (Map.Entry<String, String> entry : attempt.getCellAnswers().entrySet()) {
                Double percent = percentByKey.get(entry.getKey() + "|" + entry.getValue());
                deduction += 100 - (percent != null ? percent : 0);
            }
            scores.put(attempt.getId(), (int) Math.max(0, Math.round(UNIQUENESS_CEILING - deduction)));
        }
        return scores;
    }

    private Map<String, Long> buildScoreDistribution(List<PuzzleAttempt> attempts) {
        Map<Integer, Long> counts = attempts.stream()
            .collect(Collectors.groupingBy(PuzzleAttempt::getScore, Collectors.counting()));
        Map<String, Long> distribution = new LinkedHashMap<>();
        for (int score = 0; score <= MAX_SCORE; score++) {
            distribution.put(String.valueOf(score), counts.getOrDefault(score, 0L));
        }
        return distribution;
    }

    private YourStats buildYourStats(List<PuzzleAttempt> attempts, String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return null;
        }
        return attempts.stream()
            .filter(a -> a.getSessionId().equals(sessionId))
            .findFirst()
            .map(a -> new YourStats(a.getScore(), a.getCellAnswers()))
            .orElse(null);
    }
}
