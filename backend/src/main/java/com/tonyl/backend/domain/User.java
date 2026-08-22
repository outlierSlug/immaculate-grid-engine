package com.tonyl.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

// A signed-in account, identified by Google's own stable subject id
// (googleSub) rather than email - emails can change/be reused, sub cannot.
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String googleSub;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String displayName;

    private String avatarUrl;

    @Column(nullable = false)
    private Instant createdAt;

    protected User() {
    }

    public User(String googleSub, String email, String displayName, String avatarUrl, Instant createdAt) {
        this.googleSub = googleSub;
        this.email = email;
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public String getGoogleSub() { return googleSub; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public String getAvatarUrl() { return avatarUrl; }
    public Instant getCreatedAt() { return createdAt; }
}
