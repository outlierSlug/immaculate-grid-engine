package com.tonyl.backend.repository;

import com.tonyl.backend.domain.PuzzleAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PuzzleAttemptRepository extends JpaRepository<PuzzleAttempt, Long> {
    Optional<PuzzleAttempt> findByPuzzleIdAndSessionId(String puzzleId, String sessionId);
    List<PuzzleAttempt> findByPuzzleId(String puzzleId);
}
