package com.tonyl.backend.api;

import com.tonyl.backend.domain.CategorySnapshot;

import java.util.List;
import java.util.Map;

// Same shape as AdminPuzzleCandidateResponse minus the derived
// cellAnswerCounts - a candidate taken verbatim from GET /candidates can be
// reposted here unmodified.
public record PinPuzzleRequest(
    List<CategorySnapshot> rowCategories,
    List<CategorySnapshot> colCategories,
    Map<String, List<String>> cellSolutions
) {}
