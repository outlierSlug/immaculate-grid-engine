package com.tonyl.backend.domain;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.Map;

// One row per (puzzle, anonymous session) - written once, at game-over, and
// never updated afterward. Safe to treat as write-once specifically because
// Daily's board is frozen at game-over (no "Keep Playing" re-opens it), so
// the recorded cellAnswers can never go stale relative to what the player
// actually finished with.
@Entity
@Table(name = "puzzle_attempts", uniqueConstraints = @UniqueConstraint(columnNames = {"puzzleId", "sessionId"}))
public class PuzzleAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String puzzleId;

    @Column(nullable = false)
    private String sessionId;

    // "row-col" -> itemId, only cells actually solved correctly. This is the
    // only frozen fact this table stores - every rarity/uniqueness number
    // shown to players is recomputed live from this data on every request,
    // never cached or stored (see PuzzleStatsService).
    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, String> cellAnswers;

    @Column(nullable = false)
    private int score;

    @Column(nullable = false)
    private int guessesUsed;

    @Column(nullable = false)
    private boolean solved;

    @Column(nullable = false)
    private boolean gaveUp;

    @Column(nullable = false)
    private long elapsedMs;

    @Column(nullable = false)
    private Instant completedAt;

    protected PuzzleAttempt() {
    }

    public PuzzleAttempt(String puzzleId, String sessionId, Map<String, String> cellAnswers, int score,
                          int guessesUsed, boolean solved, boolean gaveUp, long elapsedMs, Instant completedAt) {
        this.puzzleId = puzzleId;
        this.sessionId = sessionId;
        this.cellAnswers = cellAnswers;
        this.score = score;
        this.guessesUsed = guessesUsed;
        this.solved = solved;
        this.gaveUp = gaveUp;
        this.elapsedMs = elapsedMs;
        this.completedAt = completedAt;
    }

    public Long getId() { return id; }
    public String getPuzzleId() { return puzzleId; }
    public String getSessionId() { return sessionId; }
    public Map<String, String> getCellAnswers() { return cellAnswers; }
    public int getScore() { return score; }
    public int getGuessesUsed() { return guessesUsed; }
    public boolean isSolved() { return solved; }
    public boolean isGaveUp() { return gaveUp; }
    public long getElapsedMs() { return elapsedMs; }
    public Instant getCompletedAt() { return completedAt; }
}
