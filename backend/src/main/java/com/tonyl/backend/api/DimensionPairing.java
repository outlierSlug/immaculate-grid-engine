package com.tonyl.backend.api;

// dimensionA/dimensionB are alphabetically ordered (dimensionA <=
// dimensionB) so "element x rarity" and "rarity x element" tally together
// under one row instead of two.
public record DimensionPairing(String dimensionA, String dimensionB, int appearances) {}
