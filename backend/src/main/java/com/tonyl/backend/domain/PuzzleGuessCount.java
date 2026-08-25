package com.tonyl.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

// One row per (puzzle, session) that has spent at least one guess against a
// guess-limited puzzle (DAILY always; UNLIMITED only when the player turned
// off unlimitedGuesses) - the server-side source of truth PuzzleService.
// checkGuess enforces against, since a guess limit tracked only in the
// frontend's React state can be bypassed entirely by calling POST
// /puzzle/{id}/guess directly. Written exclusively through
// PuzzleGuessCountRepository's atomic upsert-and-check query, never through
// a plain save() - this class exists mainly so Hibernate's ddl-auto=update
// creates the table with the right shape (including the unique index that
// query's ON CONFLICT target relies on) at startup.
@Entity
@Table(name = "puzzle_guess_counts", uniqueConstraints = @UniqueConstraint(columnNames = {"puzzleId", "sessionId"}))
public class PuzzleGuessCount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String puzzleId;

    @Column(nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private int guessesUsed;

    protected PuzzleGuessCount() {
    }

    public Long getId() { return id; }
    public String getPuzzleId() { return puzzleId; }
    public String getSessionId() { return sessionId; }
    public int getGuessesUsed() { return guessesUsed; }
}
