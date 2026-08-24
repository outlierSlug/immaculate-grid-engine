package com.tonyl.backend.api;

import com.tonyl.backend.domain.CategorySnapshot;
import com.tonyl.backend.puzzle.GridGenerator;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// Same field shape as PinPuzzleRequest plus the derived cellAnswerCounts -
// so the frontend (or a script) can take one candidate straight out of a
// GET /candidates response and repost it verbatim to POST /pin.
public record AdminPuzzleCandidateResponse(
    List<CategorySnapshot> rowCategories,
    List<CategorySnapshot> colCategories,
    Map<String, List<String>> cellSolutions,
    Map<String, Integer> cellAnswerCounts
) {
    public static AdminPuzzleCandidateResponse from(GridGenerator.GeneratedPuzzle generated) {
        return new AdminPuzzleCandidateResponse(
            generated.rowCategories().stream().map(CategorySnapshot::from).toList(),
            generated.colCategories().stream().map(CategorySnapshot::from).toList(),
            generated.cellSolutions(),
            generated.cellSolutions().entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().size()))
        );
    }
}
