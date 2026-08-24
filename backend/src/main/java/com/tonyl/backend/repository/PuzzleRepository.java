package com.tonyl.backend.repository;

import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.domain.PuzzleMode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PuzzleRepository extends JpaRepository<Puzzle, String> {
    // Scoped by mode: Unlimited puzzles also carry today's puzzleDate (as
    // metadata only), so a lookup by (gameId, puzzleDate) alone would match
    // multiple rows once Unlimited puzzles exist for the same day.
    Optional<Puzzle> findByGameIdAndPuzzleDateAndMode(String gameId, LocalDate puzzleDate, PuzzleMode mode);

    // Every eligible (already-live) Daily puzzle for one game, in one query -
    // AdminTrackingService groups the result by window (all-time/
    // trailing-30-day) in memory, rather than issuing a separate query per
    // window. Scoped by gameId at the DB level (not filtered in memory
    // afterward) so this stays cheap as puzzle history accumulates across
    // every game, not just the one being viewed.
    List<Puzzle> findByGameIdAndModeAndPuzzleDateLessThanEqual(String gameId, PuzzleMode mode, LocalDate date);
}