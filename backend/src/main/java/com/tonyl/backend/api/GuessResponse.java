package com.tonyl.backend.api;

public record GuessResponse(boolean correct, String itemId, String displayName, String imageUrl) {}