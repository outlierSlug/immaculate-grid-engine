package com.tonyl.backend.auth;

import com.tonyl.backend.domain.User;
import com.tonyl.backend.domain.UserSession;
import com.tonyl.backend.repository.UserRepository;
import com.tonyl.backend.repository.UserSessionRepository;

import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.Instant;
import java.util.Optional;

// Resolves @CurrentUser controller parameters (bare User or Optional<User>)
// from the request's "Authorization: Bearer <token>" header - see
// CurrentUser's doc comment and SecurityConfig's class comment for why this
// is fully independent of Spring Security's own request-authentication
// context. Registered in WebConfig.addArgumentResolvers.
@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    private final UserSessionRepository userSessionRepository;
    private final UserRepository userRepository;

    public CurrentUserArgumentResolver(UserSessionRepository userSessionRepository, UserRepository userRepository) {
        this.userSessionRepository = userSessionRepository;
        this.userRepository = userRepository;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        if (!parameter.hasParameterAnnotation(CurrentUser.class)) {
            return false;
        }
        Class<?> type = parameter.getParameterType();
        return type.equals(User.class) || type.equals(Optional.class);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                   NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        boolean optional = parameter.getParameterType().equals(Optional.class);
        Optional<User> user = resolveUser(webRequest);

        if (optional) {
            return user;
        }
        return user.orElseThrow(() -> new UnauthorizedException("Missing or invalid Authorization header"));
    }

    private Optional<User> resolveUser(NativeWebRequest webRequest) {
        String header = webRequest.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            return Optional.empty();
        }
        String token = header.substring("Bearer ".length());

        return userSessionRepository.findByToken(token)
            .filter(session -> session.getExpiresAt().isAfter(Instant.now()))
            .map(UserSession::getUserId)
            .flatMap(userRepository::findById);
    }
}
