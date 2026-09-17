package com.tonyl.backend.puzzle;

import com.tonyl.backend.api.CollectionEntry;
import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.domain.PuzzleAttempt;
import com.tonyl.backend.domain.User;
import com.tonyl.backend.repository.PuzzleAttemptRepository;
import com.tonyl.backend.repository.PuzzleRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;

// A signed-in user's character collection, derived live from their existing
// PuzzleAttempt rows rather than stored - same principle as streaks in
// UserStatsService. cellAnswers only ever holds correct guesses, archive
// completions carry playedLive=false, and Unlimited never records attempts,
// so "correct answer in a live Daily" falls straight out of data that
// already exists (and existing players' past Dailies count retroactively).
@Service
public class UserCollectionService {

    private final PuzzleAttemptRepository puzzleAttemptRepository;
    private final PuzzleRepository puzzleRepository;

    public UserCollectionService(PuzzleAttemptRepository puzzleAttemptRepository, PuzzleRepository puzzleRepository) {
        this.puzzleAttemptRepository = puzzleAttemptRepository;
        this.puzzleRepository = puzzleRepository;
    }

    // before (exclusive) lets the Daily grid ask for the collection as it
    // stood before today's puzzle, so a cell's "new / C1 / C2" badge stays
    // the same whether or not today's attempt has been submitted yet.
    public List<CollectionEntry> getCollection(User user, String gameId, LocalDate before) {
        List<PuzzleAttempt> liveAttempts = puzzleAttemptRepository.findBySessionId("user:" + user.getId()).stream()
            .filter(PuzzleAttempt::isPlayedLive)
            .toList();
        if (liveAttempts.isEmpty()) {
            return List.of();
        }

        Map<String, Puzzle> puzzlesById = puzzleRepository.findAllById(
                liveAttempts.stream().map(PuzzleAttempt::getPuzzleId).distinct().toList())
            .stream()
            .collect(Collectors.toMap(Puzzle::getId, Function.identity()));

        return buildCollection(gameId, liveAttempts, puzzlesById, before);
    }

    // Package-private for UserCollectionServiceTest, same convention as
    // UserStatsService.buildGameStats. Expects attempts already filtered to
    // playedLive - it does not re-filter.
    List<CollectionEntry> buildCollection(String gameId, List<PuzzleAttempt> liveAttempts,
                                          Map<String, Puzzle> puzzlesById, LocalDate before) {
        Map<String, TreeSet<LocalDate>> datesByItem = new HashMap<>();
        for (PuzzleAttempt attempt : liveAttempts) {
            Puzzle puzzle = puzzlesById.get(attempt.getPuzzleId());
            if (puzzle == null || !puzzle.getGameId().equals(gameId)) {
                continue;
            }
            if (before != null && !puzzle.getPuzzleDate().isBefore(before)) {
                continue;
            }
            for (String itemId : attempt.getCellAnswers().values()) {
                datesByItem.computeIfAbsent(itemId, id -> new TreeSet<>()).add(puzzle.getPuzzleDate());
            }
        }

        return datesByItem.entrySet().stream()
            .map(e -> new CollectionEntry(e.getKey(), e.getValue().size(), List.copyOf(e.getValue())))
            .sorted(Comparator.comparing(CollectionEntry::itemId))
            .toList();
    }
}
