package com.tonyl.backend.domain;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.util.Map;

@Entity
@Table(name = "grid_items")
public class GridItem {
    @Id
    private String id;

    @Column(nullable = false)
    private String gameId;

    @Column(nullable = false)
    private String displayName;

    private String imageUrl;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> attributes;  // flexible per-game attribute bag

    protected GridItem() {
        // required no-arg constructor for JPA/Hibernate
    }

    public GridItem(String id, String gameId, String displayName, String imageUrl, Map<String, Object> attributes) {
        this.id = id;
        this.gameId = gameId;
        this.displayName = displayName;
        this.imageUrl = imageUrl;
        this.attributes = attributes;
    }

    public String getId() { return id; }
    public String getGameId() { return gameId; }
    public String getDisplayName() { return displayName; }
    public String getImageUrl() { return imageUrl; }
    public Map<String, Object> getAttributes() { return attributes; }
}