package com.tonyl.backend.repository;

import com.tonyl.backend.domain.GridItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GridItemRepository extends JpaRepository<GridItem, String> {
    List<GridItem> findByGameId(String gameId);
}