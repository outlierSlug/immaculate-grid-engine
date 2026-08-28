package com.tonyl.backend.repository;

import com.tonyl.backend.domain.LoginCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface LoginCodeRepository extends JpaRepository<LoginCode, Long> {
    Optional<LoginCode> findByCode(String code);

    // Atomically marks a code consumed and reports whether THIS call is the
    // one that did it - same "single round trip, let the WHERE clause gate
    // concurrent callers" idiom as PuzzleGuessCountRepository.tryConsumeGuess.
    // A plain findByCode + isConsumed()/isBefore() check + save() (the
    // original approach) is a read-check-mutate-save race: two concurrent
    // exchanges for the same code can both read consumed=false before either
    // write commits, and both mint a session from what's documented as a
    // single-use code. This UPDATE ... WHERE only ever flips consumed=false
    // -> true for the FIRST caller to reach Postgres; a second concurrent
    // caller's UPDATE matches zero rows (the WHERE no longer holds) and
    // returns 0, with nothing left to race against. CURRENT_TIMESTAMP (not a
    // bound Instant parameter) keeps the expiry check inside the same atomic
    // statement without any driver-specific Instant-binding concerns.
    @Modifying
    @Transactional
    @Query(value = """
        UPDATE login_codes
        SET consumed = true
        WHERE code = :code AND consumed = false AND expires_at > CURRENT_TIMESTAMP
        """, nativeQuery = true)
    int tryConsume(@Param("code") String code);
}
