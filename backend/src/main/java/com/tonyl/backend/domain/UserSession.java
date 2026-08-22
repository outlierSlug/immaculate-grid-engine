package com.tonyl.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

// One row per active login (a browser/device that completed the Google
// OAuth flow). token is an opaque bearer credential, not a JWT - trivially
// revocable by deleting the row (see logout), no signing-key management.
// userId is a plain column, not a @ManyToOne, matching PuzzleAttempt's
// existing puzzleId-as-plain-string convention in this codebase.
@Entity
@Table(name = "user_sessions")
public class UserSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant expiresAt;

    protected UserSession() {
    }

    public UserSession(String token, Long userId, Instant createdAt, Instant expiresAt) {
        this.token = token;
        this.userId = userId;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public Long getId() { return id; }
    public String getToken() { return token; }
    public Long getUserId() { return userId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
}
