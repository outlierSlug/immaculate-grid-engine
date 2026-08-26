package com.tonyl.backend.game;

import org.springframework.stereotype.Component;

@Component
public class GameModuleRegistry {

    public GameModule resolve(String gameId) {
        return switch (gameId) {
            case "genshin" -> new GenshinGameModule();
            case "brawlstars" -> new BrawlStarsGameModule();
            case "clashroyale" -> new ClashRoyaleGameModule();
            default -> throw new IllegalArgumentException("Unknown gameId: " + gameId);
        };
    }
}
