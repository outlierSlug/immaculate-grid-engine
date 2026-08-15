package com.tonyl.backend.api;

import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.puzzle.PuzzleService;
import com.tonyl.backend.puzzle.PuzzleStatsService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/puzzle")
@CrossOrigin(origins = "http://localhost:5173")
public class PuzzleController {

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
    public ResponseEntity<Void> submitAttempt(@PathVariable String puzzleId, @RequestBody SubmitAttemptRequest request) {
        puzzleStatsService.submitAttempt(puzzleId, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{puzzleId}/stats")
    public PuzzleStatsResponse stats(@PathVariable String puzzleId,
                                      @RequestParam(required = false) String sessionId) {
        return puzzleStatsService.getStats(puzzleId, sessionId);
    }
}