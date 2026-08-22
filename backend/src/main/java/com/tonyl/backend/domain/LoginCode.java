package com.tonyl.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

// Short-lived, single-use exchange code handed to the browser in the OAuth
// redirect's URL fragment instead of the real UserSession token - a
// fragment never reaches any server access log, but a long-lived token
// sitting in it would still linger in browser history. This code is
// consumed immediately by POST /api/auth/exchange for the real token,
// which comes back in a JSON body instead.
@Entity
@Table(name = "login_codes")
public class LoginCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean consumed;

    protected LoginCode() {
    }

    public LoginCode(String code, Long userId, Instant expiresAt) {
        this.code = code;
        this.userId = userId;
        this.expiresAt = expiresAt;
        this.consumed = false;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public Long getUserId() { return userId; }
    public Instant getExpiresAt() { return expiresAt; }
    public boolean isConsumed() { return consumed; }
    public void markConsumed() { this.consumed = true; }
}
