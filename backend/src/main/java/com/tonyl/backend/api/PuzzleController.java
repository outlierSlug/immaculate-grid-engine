package com.tonyl.backend.api;

import com.tonyl.backend.auth.CurrentUser;
import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.domain.User;
import com.tonyl.backend.puzzle.PuzzleClock;
import com.tonyl.backend.puzzle.PuzzleService;
import com.tonyl.backend.puzzle.PuzzleStatsService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Optional;

@RestController
@RequestMapping("/api/puzzle")
public class PuzzleController {

    // Archived puzzles are reachable for any date within this many days of
    // today (inclusive), enforced here since neither GridGenerator's
    // determinism nor PuzzleService.getOrCreateForDate cares which date is
    // asked for - the window is purely a product/business rule.
    private static final int ARCHIVE_WINDOW_DAYS = 30;

    private final PuzzleService puzzleService;
    private final PuzzleStatsService puzzleStatsService;

    public PuzzleController(PuzzleService puzzleService, PuzzleStatsService puzzleStatsService) {
        this.puzzleService = puzzleService;
        this.puzzleStatsService = puzzleStatsService;
    }

    @GetMapping("/today")
    public PuzzleResponse today(@RequestParam(defaultValue = "genshin") String game) {
        Puzzle puzzle = puzzleService.getOrCreateTodaysPuzzle(game);
        return PuzzleResponse.from(puzzle);
    }

    // Requires login (@CurrentUser User, not Optional) - archived play is an
    // account-only feature per the original design.
    @GetMapping("/archive")
    public PuzzleResponse archive(@RequestParam(defaultValue = "genshin") String game,
                                   @RequestParam String date,
                                   @CurrentUser User user) {
        LocalDate parsedDate;
        try {
            parsedDate = LocalDate.parse(date);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("date must be a valid ISO date (yyyy-MM-dd)");
        }
        LocalDate today = PuzzleClock.today();
        // Strictly before today, not "on or before" - a puzzle only enters
        // the archive once its own day has actually ended. This is the
        // authoritative check: the frontend used to also compare against a
        // client-computed "today" before ever calling this endpoint, but
        // that used the browser's UTC date (Date.toISOString()) against
        // this server's local one, disagreeing for hours every day - today's
        // puzzle could sail through as if it were already archived. Removed
        // that client-side guess entirely in favor of this single source of
        // truth; the frontend now just redirects on this rejection.
        if (!parsedDate.isBefore(today) || parsedDate.isBefore(today.minusDays(ARCHIVE_WINDOW_DAYS))) {
            throw new IllegalArgumentException("date must be a past date within the last " + ARCHIVE_WINDOW_DAYS + " days");
        }
        Puzzle puzzle = puzzleService.getOrCreateForDate(game, parsedDate);
        return PuzzleResponse.from(puzzle);
    }

    @PostMapping("/unlimited")
    public PuzzleResponse unlimited(@RequestParam(defaultValue = "genshin") String game,
                                     @RequestBody(required = false) UnlimitedPuzzleRequest request) {
        Puzzle puzzle = puzzleService.generateUnlimitedPuzzle(game, request != null ? request : UnlimitedPuzzleRequest.defaults());
        return PuzzleResponse.from(puzzle);
    }

    @PostMapping("/{puzzleId}/guess")
    public GuessResponse guess(@PathVariable String puzzleId, @RequestBody GuessRequest request) {
        var result = puzzleService.checkGuess(puzzleId, request.row(), request.col(), request.itemId());
        return new GuessResponse(result.correct(), result.itemId(), result.displayName(), result.imageUrl());
    }

    @PostMapping("/{puzzleId}/attempt")
    public ResponseEntity<Void> submitAttempt(@PathVariable String puzzleId, @RequestBody SubmitAttemptRequest request,
                                               @CurrentUser Optional<User> user) {
        puzzleStatsService.submitAttempt(puzzleId, request, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{puzzleId}/stats")
    public PuzzleStatsResponse stats(@PathVariable String puzzleId,
                                      @RequestParam(required = false) String sessionId,
                                      @CurrentUser Optional<User> user) {
        return puzzleStatsService.getStats(puzzleId, sessionId, user);
    }
}