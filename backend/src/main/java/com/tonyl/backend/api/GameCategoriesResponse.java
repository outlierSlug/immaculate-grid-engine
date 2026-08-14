package com.tonyl.backend.api;

import java.util.List;

public record GameCategoriesResponse(String gameId, List<DimensionCategories> dimensions) {

    public record DimensionCategories(String dimension, List<CategoryOption> categories) {}

    public record CategoryOption(String id, String label) {}
}
