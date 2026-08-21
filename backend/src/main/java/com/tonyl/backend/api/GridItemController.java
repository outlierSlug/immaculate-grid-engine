package com.tonyl.backend.api;

import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.repository.GridItemRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/items")
public class GridItemController {

    private final GridItemRepository repository;

    public GridItemController(GridItemRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<GridItem> list(@RequestParam(defaultValue = "genshin") String game) {
        return repository.findByGameId(game);
    }
}