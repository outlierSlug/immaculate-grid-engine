package com.tonyl.backend.api;

import com.tonyl.backend.domain.CategorySnapshot;
import com.tonyl.backend.domain.Puzzle;

import java.time.LocalDate;
import java.util.List;

// Read-only past-puzzle view for the admin History tab: category shape plus
// the same full-reveal PuzzleStatsResponse a player who'd completed the
// puzzle would see (via PuzzleStatsService.getStatsForAdmin) - no
// cellSolutions/cellAnswerCounts of its own, unlike AdminPuzzleResponse,
// since stats.perCell already carries every valid answer per cell (count 0
// included) plus who actually picked what.
public record AdminPuzzleHistoryResponse(
    String id,
    String gameId,
    LocalDate puzzleDate,
    List<CategorySnapshot> rowCategories,
    List<CategorySnapshot> colCategories,
    PuzzleStatsResponse stats
) {
    public static AdminPuzzleHistoryResponse from(Puzzle puzzle, PuzzleStatsResponse stats) {
        return new AdminPuzzleHistoryResponse(
            puzzle.getId(),
            puzzle.getGameId(),
            puzzle.getPuzzleDate(),
            puzzle.getRowCategories(),
            puzzle.getColCategories(),
            stats
        );
    }
}
