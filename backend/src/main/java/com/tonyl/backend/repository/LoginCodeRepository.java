package com.tonyl.backend.repository;

import com.tonyl.backend.domain.LoginCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LoginCodeRepository extends JpaRepository<LoginCode, Long> {
    Optional<LoginCode> findByCode(String code);
}
