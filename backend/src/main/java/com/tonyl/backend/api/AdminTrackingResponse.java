package com.tonyl.backend.api;

public record AdminTrackingResponse(TrackingWindow allTime, TrackingWindow trailing30Days) {}
