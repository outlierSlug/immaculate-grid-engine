package com.tonyl.backend.api;

import com.tonyl.backend.auth.CurrentUser;
import com.tonyl.backend.domain.User;
import com.tonyl.backend.puzzle.UserCollectionService;
import com.tonyl.backend.puzzle.UserStatsService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/users/me")
public class UserStatsController {

    private final UserStatsService userStatsService;
    private final UserCollectionService userCollectionService;

    public UserStatsController(UserStatsService userStatsService, UserCollectionService userCollectionService) {
        this.userStatsService = userStatsService;
        this.userCollectionService = userCollectionService;
    }

    @GetMapping("/collection")
    public List<CollectionEntry> collection(
        @RequestParam String game,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate before,
        @CurrentUser User user
    ) {
        return userCollectionService.getCollection(user, game, before);
    }

    @GetMapping("/stats")
    public UserStatsResponse stats(@CurrentUser User user) {
        return userStatsService.getStats(user);
    }

    // Separate from /stats on purpose - "have I completed this puzzle at
    // all" (for marking Archive dates as done) isn't filtered by
    // playedLive the way the career-stats aggregate above is.
    @GetMapping("/completed-dates")
    public List<CompletedDateInfo> completedDates(@RequestParam String game, @CurrentUser User user) {
        return userStatsService.getCompletedDates(user, game);
    }
}
