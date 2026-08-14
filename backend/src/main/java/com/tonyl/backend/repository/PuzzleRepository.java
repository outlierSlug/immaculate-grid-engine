package com.tonyl.backend.repository;

import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.domain.PuzzleMode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface PuzzleRepository extends JpaRepository<Puzzle, String> {
    // Scoped by mode: Unlimited puzzles also carry today's puzzleDate (as
    // metadata only), so a lookup by (gameId, puzzleDate) alone would match
    // multiple rows once Unlimited puzzles exist for the same day.
    Optional<Puzzle> findByGameIdAndPuzzleDateAndMode(String gameId, LocalDate puzzleDate, PuzzleMode mode);
}