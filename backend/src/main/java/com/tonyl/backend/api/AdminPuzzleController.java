package com.tonyl.backend.api;

import com.tonyl.backend.auth.AdminAuthorization;
import com.tonyl.backend.auth.CurrentUser;
import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.domain.User;
import com.tonyl.backend.puzzle.AdminPuzzleService;
import com.tonyl.backend.puzzle.AdminTrackingService;
import com.tonyl.backend.puzzle.GridGenerator;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

// Admin-only puzzle curation + tracking. Separate path from /api/puzzle to
// avoid any collision with existing routes. Security boundary: every
// endpoint below calls adminAuthorization.requireAdmin(user) as the literal
// first line of the method body, with zero exceptions - see
// AdminAuthorization's doc comment and docs/ARCHITECTURE.md.
@RestController
@RequestMapping("/api/admin/puzzle")
public class AdminPuzzleController {

    private final AdminAuthorization adminAuthorization;
    private final AdminPuzzleService adminPuzzleService;
    private final AdminTrackingService adminTrackingService;

    public AdminPuzzleController(AdminAuthorization adminAuthorization, AdminPuzzleService adminPuzzleService,
                                  AdminTrackingService adminTrackingService) {
        this.adminAuthorization = adminAuthorization;
        this.adminPuzzleService = adminPuzzleService;
        this.adminTrackingService = adminTrackingService;
    }

    @GetMapping("/candidates")
    public List<AdminPuzzleCandidateResponse> candidates(
            @CurrentUser User user,
            @RequestParam String game,
            @RequestParam String date,
            @RequestParam(defaultValue = "5") int count,
            @RequestParam(defaultValue = "1") int minAnswersPerCell) {
        adminAuthorization.requireAdmin(user);

        LocalDate parsedDate = parseDate(date);
        List<GridGenerator.GeneratedPuzzle> generated =
            adminPuzzleService.generateCandidates(game, parsedDate, count, minAnswersPerCell);
        return generated.stream().map(AdminPuzzleCandidateResponse::from).toList();
    }

    @PostMapping("/pin")
    public AdminPuzzleResponse pin(
            @CurrentUser User user,
            @RequestParam String game,
            @RequestParam String date,
            @RequestBody PinPuzzleRequest request) {
        adminAuthorization.requireAdmin(user);

        LocalDate parsedDate = parseDate(date);
        Puzzle puzzle = adminPuzzleService.pinFuturePuzzle(game, parsedDate, request);
        return AdminPuzzleResponse.from(puzzle);
    }

    // Lets the admin see what's currently set for a future date before
    // deciding to regenerate. Note: peeking at an unset future date
    // auto-generates-and-saves a real placeholder row (harmless, still
    // overwritable by /pin until the date goes live) - restricted to future
    // dates by AdminPuzzleService.getPinnedPreview, same bound as pinning
    // itself, so this can never fabricate a stand-in puzzle for a genuinely
    // past date the way calling getOrCreateForDate with no guard could.
    @GetMapping("/pinned")
    public AdminPuzzleResponse pinned(
            @CurrentUser User user,
            @RequestParam String game,
            @RequestParam String date) {
        adminAuthorization.requireAdmin(user);

        LocalDate parsedDate = parseDate(date);
        Puzzle puzzle = adminPuzzleService.getPinnedPreview(game, parsedDate);
        return AdminPuzzleResponse.from(puzzle);
    }

    // Read-only puzzle view for the History tab - today or any genuinely
    // past date, not just the last 30 days (unlike the public /puzzle/archive
    // endpoint), since this never risks fabricating a puzzle a player would
    // then be shown as if it were real; see AdminPuzzleService.getHistory.
    @GetMapping("/history")
    public AdminPuzzleHistoryResponse history(
            @CurrentUser User user,
            @RequestParam String game,
            @RequestParam String date) {
        adminAuthorization.requireAdmin(user);

        LocalDate parsedDate = parseDate(date);
        return adminPuzzleService.getHistory(game, parsedDate);
    }

    @GetMapping("/tracking")
    public AdminTrackingResponse tracking(
            @CurrentUser User user,
            @RequestParam String game) {
        adminAuthorization.requireAdmin(user);

        return adminTrackingService.buildReport(game);
    }

    // Manual puzzle builder: no candidate search, no randomness - direct
    // evaluation of the exact 3 row + 3 col category ids the admin picked.
    // Spring binds a single comma-separated query param into List<String>
    // for a @RequestParam of that type, so ?rowCategoryIds=a,b,c works
    // without any custom converter.
    @GetMapping("/evaluate")
    public AdminPuzzleEvaluationResponse evaluate(
            @CurrentUser User user,
            @RequestParam String game,
            @RequestParam List<String> rowCategoryIds,
            @RequestParam List<String> colCategoryIds) {
        adminAuthorization.requireAdmin(user);

        AdminPuzzleService.EvaluatedGrid evaluated =
            adminPuzzleService.evaluateGrid(game, rowCategoryIds, colCategoryIds);
        return AdminPuzzleEvaluationResponse.from(evaluated);
    }

    // Mirrors PuzzleController.archive's existing catch-and-rethrow-as-400
    // pattern.
    private LocalDate parseDate(String date) {
        try {
            return LocalDate.parse(date);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("date must be a valid ISO date (yyyy-MM-dd)");
        }
    }
}
