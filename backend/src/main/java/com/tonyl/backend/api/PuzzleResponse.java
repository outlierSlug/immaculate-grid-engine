package com.tonyl.backend.api;

import com.tonyl.backend.domain.CategorySnapshot;
import com.tonyl.backend.domain.Puzzle;

import java.time.LocalDate;
import java.util.List;

public record PuzzleResponse(
    String id,
    String gameId,
    LocalDate puzzleDate,
    List<String> rowLabels,
    List<String> colLabels
) {
    public static PuzzleResponse from(Puzzle puzzle) {
        return new PuzzleResponse(
            puzzle.getId(),
            puzzle.getGameId(),
            puzzle.getPuzzleDate(),
            puzzle.getRowCategories().stream().map(CategorySnapshot::label).toList(),
            puzzle.getColCategories().stream().map(CategorySnapshot::label).toList()
        );
    }
}