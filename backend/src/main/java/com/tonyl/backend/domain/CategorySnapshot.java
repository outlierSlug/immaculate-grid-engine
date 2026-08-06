package com.tonyl.backend.domain;

import java.io.Serializable;

public record CategorySnapshot(String id, String label) implements Serializable {}