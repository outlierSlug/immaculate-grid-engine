package com.tonyl.backend.auth;

import com.tonyl.backend.domain.User;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

// Flat email allowlist, not a roles system - the admin panel is for one
// person, reached by a bookmarked URL. The only path to becoming "admin" is
// having deploy-level access to set ADMIN_EMAILS on the real server
// environment; there is no self-service or user-input-derived path anywhere
// in this design, and the email itself comes from Google's verified OAuth
// response, never client input. requireAdmin is called as the literal first
// line of every admin endpoint, with zero exceptions - see
// AdminPuzzleController. A blank ADMIN_EMAILS fails "closed" (nobody,
// including the real admin, passes) rather than loudly - see
// docs/ARCHITECTURE.md.
@Component
public class AdminAuthorization {

    private static final Logger log = LoggerFactory.getLogger(AdminAuthorization.class);

    private final Set<String> adminEmails;

    public AdminAuthorization(@Value("${app.admin.emails}") String adminEmailsProperty) {
        this.adminEmails = Arrays.stream(adminEmailsProperty.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(s -> s.toLowerCase(Locale.ROOT))
            .collect(Collectors.toSet());
    }

    public void requireAdmin(User user) {
        String email = user.getEmail() == null ? "" : user.getEmail().toLowerCase(Locale.ROOT);
        if (adminEmails.contains(email)) {
            return;
        }
        // Logged before throwing so a probing attempt is visible in server
        // logs even though the caller only ever sees a generic 403.
        log.warn("Admin access denied: email={} endpoint={} at={}",
            user.getEmail(), currentEndpointDescription(), Instant.now());
        throw new ForbiddenException("Admin access required");
    }

    // Best-effort - only meaningful inside an actual HTTP request thread. A
    // direct unit test call to requireAdmin() has no request context, so
    // this degrades to "unknown" rather than throwing.
    private String currentEndpointDescription() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletAttributes) {
            var request = servletAttributes.getRequest();
            return request.getMethod() + " " + request.getRequestURI();
        }
        return "unknown";
    }
}
