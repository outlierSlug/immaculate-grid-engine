package com.tonyl.backend.api;

import java.util.Map;

public record SubmitAttemptRequest(
    String sessionId,
    Map<String, String> cellAnswers,
    int score,
    int guessesUsed,
    boolean solved,
    boolean gaveUp,
    long elapsedMs
) {}
