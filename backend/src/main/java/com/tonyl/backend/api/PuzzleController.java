package com.tonyl.backend.api;

import com.tonyl.backend.domain.Puzzle;
import com.tonyl.backend.puzzle.PuzzleService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/puzzle")
public class PuzzleController {

    private final PuzzleService puzzleService;

    public PuzzleController(PuzzleService puzzleService) {
        this.puzzleService = puzzleService;
    }

    @GetMapping("/today")
    public PuzzleResponse today(@RequestParam(defaultValue = "genshin") String game) {
        Puzzle puzzle = puzzleService.getOrCreateTodaysPuzzle(game);
        return PuzzleResponse.from(puzzle);
    }
}