package com.tonyl.backend.loader;

import com.tonyl.backend.domain.GridItem;
import com.tonyl.backend.repository.GridItemRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

@Component
@Profile("load-data")
public class GameDataLoader implements CommandLineRunner {

    private static final Map<String, String> GAME_SEED_FILES = Map.of(
        "genshin", "genshin_entities.json",
        "brawlstars", "brawlstars_entities.json",
        "clashroyale", "clashroyale_entities.json"
    );

    private final GridItemRepository repository;
    private final JsonMapper jsonMapper;

    public GameDataLoader(GridItemRepository repository, JsonMapper jsonMapper) {
        this.repository = repository;
        this.jsonMapper = jsonMapper;
    }

    @Override
    public void run(String... args) throws Exception {
        for (Map.Entry<String, String> entry : GAME_SEED_FILES.entrySet()) {
            loadGame(entry.getKey(), entry.getValue());
        }
    }

    @SuppressWarnings("unchecked")
    private void loadGame(String gameId, String fileName) throws Exception {
        InputStream is = new ClassPathResource(fileName).getInputStream();
        List<Map<String, Object>> raw = jsonMapper.readValue(
            is, new TypeReference<List<Map<String, Object>>>() {}
        );

        int count = 0;
        for (Map<String, Object> record : raw) {
            GridItem item = new GridItem(
                (String) record.get("id"),
                (String) record.get("game_id"),
                (String) record.get("display_name"),
                (String) record.get("image_url"),
                (Map<String, Object>) record.get("attributes")
            );
            repository.save(item);
            count++;
        }
        System.out.println("Loaded " + count + " grid items for " + gameId);
    }
}