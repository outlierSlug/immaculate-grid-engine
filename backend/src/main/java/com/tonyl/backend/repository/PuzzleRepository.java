package com.tonyl.backend.repository;

import com.tonyl.backend.domain.Puzzle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface PuzzleRepository extends JpaRepository<Puzzle, String> {
    Optional<Puzzle> findByGameIdAndPuzzleDate(String gameId, LocalDate puzzleDate);
}