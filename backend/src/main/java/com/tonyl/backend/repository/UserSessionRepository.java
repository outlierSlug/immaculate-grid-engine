package com.tonyl.backend.repository;

import com.tonyl.backend.domain.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSession, Long> {
    Optional<UserSession> findByToken(String token);

    // Derived delete queries need their own transaction boundary - unlike
    // the built-in CRUD methods (save/deleteById/etc, already wrapped by
    // SimpleJpaRepository), this one doesn't get one for free, and with
    // this project's open-in-view=false there's no fallback session either.
    // Without @Transactional, calling this directly from a controller (as
    // AuthController.logout does) throws TransactionRequiredException on
    // every call - silently, since the frontend's logout() call is
    // deliberately fire-and-forget, so this never surfaced as a visible
    // error anywhere until the backend log was actually checked.
    @Transactional
    void deleteByToken(String token);
}
