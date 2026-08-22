package com.tonyl.backend.auth;

import com.tonyl.backend.domain.LoginCode;
import com.tonyl.backend.domain.User;
import com.tonyl.backend.repository.LoginCodeRepository;
import com.tonyl.backend.repository.UserRepository;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;

// Runs once Spring Security's own OAuth2 code-exchange with Google succeeds.
// Everything past this point (account lookup/creation, session issuance) is
// plain application code, independent of Spring Security - see
// SecurityConfig's class comment for why.
@Component
public class GoogleAuthSuccessHandler implements AuthenticationSuccessHandler {

    // Exchange code TTL - deliberately short since it only needs to survive
    // one redirect + one immediate POST from the callback page, not to be a
    // real credential itself (the real UserSession token never touches a URL).
    private static final long LOGIN_CODE_TTL_SECONDS = 60;

    private final UserRepository userRepository;
    private final LoginCodeRepository loginCodeRepository;
    private final String frontendBaseUrl;

    public GoogleAuthSuccessHandler(UserRepository userRepository,
                                     LoginCodeRepository loginCodeRepository,
                                     @Value("${app.auth.frontend-base-url}") String frontendBaseUrl) {
        this.userRepository = userRepository;
        this.loginCodeRepository = loginCodeRepository;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                         Authentication authentication) throws IOException, ServletException {
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        String sub = oauth2User.getAttribute("sub");
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");
        String picture = oauth2User.getAttribute("picture");

        User user = userRepository.findByGoogleSub(sub)
            .orElseGet(() -> userRepository.save(new User(sub, email, name, picture, Instant.now())));

        LoginCode loginCode = new LoginCode(
            UUID.randomUUID().toString(),
            user.getId(),
            Instant.now().plusSeconds(LOGIN_CODE_TTL_SECONDS)
        );
        loginCodeRepository.save(loginCode);

        response.sendRedirect(frontendBaseUrl + "/auth/callback#code=" + loginCode.getCode());
    }
}
