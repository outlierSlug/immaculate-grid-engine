package com.tonyl.backend.api;

import com.tonyl.backend.domain.CategorySnapshot;
import com.tonyl.backend.puzzle.AdminPuzzleService;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// Read-only preview for the manual puzzle builder: the direct evaluation of
// an admin-chosen (non-random) set of 6 category ids, with no candidate
// search involved. Same cellAnswerCounts derivation pattern as
// AdminPuzzleCandidateResponse (cellSolutions mapped to List::size).
public record AdminPuzzleEvaluationResponse(
    List<CategorySnapshot> rowCategories,
    List<CategorySnapshot> colCategories,
    Map<String, List<String>> cellSolutions,
    Map<String, Integer> cellAnswerCounts,
    boolean solvable
) {
    public static AdminPuzzleEvaluationResponse from(AdminPuzzleService.EvaluatedGrid evaluated) {
        return new AdminPuzzleEvaluationResponse(
            evaluated.rowCategories().stream().map(CategorySnapshot::from).toList(),
            evaluated.colCategories().stream().map(CategorySnapshot::from).toList(),
            evaluated.cellSolutions(),
            evaluated.cellSolutions().entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().size())),
            evaluated.solvable()
        );
    }
}
