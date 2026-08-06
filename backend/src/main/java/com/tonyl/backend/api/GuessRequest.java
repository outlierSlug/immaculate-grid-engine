package com.tonyl.backend.api;

public record GuessRequest(int row, int col, String itemId) {}