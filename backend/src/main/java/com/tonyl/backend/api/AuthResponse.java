package com.tonyl.backend.api;

public record AuthResponse(String token, UserResponse user) {}
