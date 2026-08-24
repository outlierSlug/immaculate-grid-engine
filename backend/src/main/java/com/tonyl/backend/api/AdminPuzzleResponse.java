package com.tonyl.backend.api;

import com.tonyl.backend.domain.CategorySnapshot;
import com.tonyl.backend.domain.Puzzle;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record AdminPuzzleResponse(
    String id,
    String gameId,
    LocalDate puzzleDate,
    List<CategorySnapshot> rowCategories,
    List<CategorySnapshot> colCategories,
    Map<String, List<String>> cellSolutions,
    Map<String, Integer> cellAnswerCounts
) {
    public static AdminPuzzleResponse from(Puzzle puzzle) {
        return new AdminPuzzleResponse(
            puzzle.getId(),
            puzzle.getGameId(),
            puzzle.getPuzzleDate(),
            puzzle.getRowCategories(),
            puzzle.getColCategories(),
            puzzle.getCellSolutions(),
            puzzle.getCellSolutions().entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().size()))
        );
    }
}
