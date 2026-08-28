package com.tonyl.backend.domain;

import com.tonyl.backend.repository.UserRepository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;

// Proves the actual persistence-layer half of the GoogleAuthSuccessHandler
// fix: a returning user's profile fields are re-synced from Google on every
// sign-in, not stuck at whatever they were on first login forever. The
// handler's own find-or-create-or-update branching is trivial control flow
// not worth mocking Spring Security's OAuth2User/Authentication/servlet
// plumbing for (a pattern this codebase doesn't otherwise use) - what's
// actually worth verifying is that update -> save really persists the new
// values and leaves the identity fields (googleSub, createdAt, id) alone.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserProfileUpdateTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void updateProfilePersistsChangedFieldsAndLeavesIdentityFieldsAlone() {
        Instant createdAt = Instant.now();
        User saved = userRepository.save(
            new User("google-sub-profile-sync", "old@example.com", "Old Name", "https://old.example/avatar.png", createdAt));
        Long id = saved.getId();

        saved.updateProfile("new@example.com", "New Name", "https://new.example/avatar.png");
        userRepository.save(saved);

        User reloaded = userRepository.findById(id).orElseThrow();
        assertEquals("new@example.com", reloaded.getEmail());
        assertEquals("New Name", reloaded.getDisplayName());
        assertEquals("https://new.example/avatar.png", reloaded.getAvatarUrl());

        // Identity/audit fields are untouched by a profile sync.
        assertEquals(id, reloaded.getId());
        assertEquals("google-sub-profile-sync", reloaded.getGoogleSub());
        assertEquals(createdAt, reloaded.getCreatedAt());
    }
}
