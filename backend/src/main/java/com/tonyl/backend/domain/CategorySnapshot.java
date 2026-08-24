package com.tonyl.backend.domain;

import com.tonyl.backend.game.CategoryDefinition;

import java.io.Serializable;

public record CategorySnapshot(String id, String label) implements Serializable {
    public static CategorySnapshot from(CategoryDefinition c) {
        return new CategorySnapshot(c.getId(), c.getLabel());
    }
}