package com.tonyl.backend.repository;

import com.tonyl.backend.domain.PuzzleGuessCount;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface PuzzleGuessCountRepository extends JpaRepository<PuzzleGuessCount, Long> {

    // Atomically records one more guess against (puzzleId, sessionId) and
    // reports whether it was allowed - a single round trip so two guesses
    // fired back-to-back (or a script spraying requests) can't both read
    // "7 used" and both proceed to increment to 8, the race a plain
    // read-then-check-then-save would allow. INSERT ... ON CONFLICT DO
    // UPDATE is atomic per-row in Postgres: the first guess for a
    // (puzzleId, sessionId) pair always inserts (guessesUsed=1, no existing
    // row to conflict with); a later guess only increments when the
    // existing row's guessesUsed is still under `limit`, via the DO UPDATE
    // ... WHERE clause - once it's not, the WHERE excludes that row from the
    // update, so 0 rows are affected and nothing is written. Returns 1 (this
    // guess is allowed and now counted) or 0 (limit already reached, reject
    // without checking correctness).
    @Modifying
    @Transactional
    @Query(value = """
        INSERT INTO puzzle_guess_counts (puzzle_id, session_id, guesses_used)
        VALUES (:puzzleId, :sessionId, 1)
        ON CONFLICT (puzzle_id, session_id)
        DO UPDATE SET guesses_used = puzzle_guess_counts.guesses_used + 1
        WHERE puzzle_guess_counts.guesses_used < :limit
        """, nativeQuery = true)
    int tryConsumeGuess(@Param("puzzleId") String puzzleId, @Param("sessionId") String sessionId,
                         @Param("limit") int limit);

    // The true, authoritative count for this (puzzle, session) pair -
    // fetched right after tryConsumeGuess above so the caller can hand it
    // back to the client instead of trusting the client's own locally-
    // computed count, which can drift from the server's (a retried request,
    // a second tab/device, or a rejected guess all leave the client's own
    // counter wrong in ways it can't detect on its own). A plain JPQL
    // property-path query, not native SQL like tryConsumeGuess - there's no
    // atomicity requirement here, just a read of whatever the atomic upsert
    // above just wrote.
    @Query("SELECT g.guessesUsed FROM PuzzleGuessCount g WHERE g.puzzleId = :puzzleId AND g.sessionId = :sessionId")
    Optional<Integer> findGuessesUsed(@Param("puzzleId") String puzzleId, @Param("sessionId") String sessionId);
}
