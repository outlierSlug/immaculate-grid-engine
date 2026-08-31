package com.tonyl.backend.api;

import java.util.List;
import java.util.Map;

// "row-col" -> every valid item id for that cell, same shape the admin
// candidate/evaluate/pinned responses already use - the frontend already
// has a fetchItems(game)-based id-resolution pattern for exactly this
// shape (see AdminCuratePanel's itemsForIds), reused as-is here rather
// than resolving to display info server-side.
public record PuzzleAnswersResponse(Map<String, List<String>> cellSolutions) {}
