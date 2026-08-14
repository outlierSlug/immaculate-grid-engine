package com.tonyl.backend.domain;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "puzzles")
public class Puzzle {

    @Id
    private String id; // e.g. "genshin:2026-08-06" (DAILY) or "genshin:unlimited:<uuid>" (UNLIMITED)

    @Column(nullable = false)
    private String gameId;

    @Column(nullable = false)
    private LocalDate puzzleDate;

    // Nullable at the DB level: this project has no migration tool (ddl-auto=update
    // only), and a NOT NULL ADD COLUMN fails outright against a non-empty puzzles
    // table. Existing pre-Unlimited-mode rows are implicitly DAILY; every row
    // written by this codebase from here on always sets it explicitly.
    @Enumerated(EnumType.STRING)
    private PuzzleMode mode;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<CategorySnapshot> rowCategories;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<CategorySnapshot> colCategories;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, List<String>> cellSolutions; // "row-col" -> valid GridItem ids

    protected Puzzle() {
    }

    public Puzzle(String id, String gameId, LocalDate puzzleDate, PuzzleMode mode,
                  List<CategorySnapshot> rowCategories, List<CategorySnapshot> colCategories,
                  Map<String, List<String>> cellSolutions) {
        this.id = id;
        this.gameId = gameId;
        this.puzzleDate = puzzleDate;
        this.mode = mode;
        this.rowCategories = rowCategories;
        this.colCategories = colCategories;
        this.cellSolutions = cellSolutions;
    }

    public String getId() { return id; }
    public String getGameId() { return gameId; }
    public LocalDate getPuzzleDate() { return puzzleDate; }
    public PuzzleMode getMode() { return mode; }
    public List<CategorySnapshot> getRowCategories() { return rowCategories; }
    public List<CategorySnapshot> getColCategories() { return colCategories; }
    public Map<String, List<String>> getCellSolutions() { return cellSolutions; }
}