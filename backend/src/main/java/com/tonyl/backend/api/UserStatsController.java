package com.tonyl.backend.api;

import com.tonyl.backend.auth.CurrentUser;
import com.tonyl.backend.domain.User;
import com.tonyl.backend.puzzle.UserStatsService;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users/me")
public class UserStatsController {

    private final UserStatsService userStatsService;

    public UserStatsController(UserStatsService userStatsService) {
        this.userStatsService = userStatsService;
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
