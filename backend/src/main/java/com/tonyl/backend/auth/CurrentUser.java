package com.tonyl.backend.auth;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

// Marks a controller method parameter to be resolved from the request's
// Authorization header - see CurrentUserArgumentResolver. Works on both a
// bare `User` (401s if missing/invalid/expired) and `Optional<User>`
// (empty in that case, for endpoints where login is optional).
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.PARAMETER)
public @interface CurrentUser {
}
