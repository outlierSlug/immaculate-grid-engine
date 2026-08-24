package com.tonyl.backend.api;

import com.tonyl.backend.puzzle.PuzzleClock;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertThrows;

// Plain JUnit, no Spring context - every case here is rejected by
// validation before PuzzleController ever touches puzzleService, so both
// service dependencies and the @CurrentUser param (unused in the method
// body itself, only required by the annotation for the real HTTP auth
// gate) can stay null, same convention as AdminPuzzleServiceTest.
class PuzzleControllerTest {

    @Test
    void archiveRejectsADateBeforeLaunchDateEvenWithinTheRollingWindow() {
        // launchDate is 5 days ago; requestedDate is 10 days ago - within
        // the 30-day rolling window, but before the site actually existed.
        LocalDate today = PuzzleClock.today();
        String launchDate = today.minusDays(5).toString();
        PuzzleController controller = new PuzzleController(null, null, launchDate);

        String requestedDate = today.minusDays(10).toString();
        assertThrows(IllegalArgumentException.class,
            () -> controller.archive("genshin", requestedDate, null));
    }

    @Test
    void archiveAllowsADateOnOrAfterLaunchDateToReachPuzzleService() {
        // A null puzzleService would NPE past validation - reaching that
        // NPE (not the IllegalArgumentException validation throws) proves
        // this date was accepted rather than rejected by the launch-date
        // floor.
        LocalDate today = PuzzleClock.today();
        String launchDate = today.minusDays(5).toString();
        PuzzleController controller = new PuzzleController(null, null, launchDate);

        String requestedDate = today.minusDays(3).toString();
        assertThrows(NullPointerException.class,
            () -> controller.archive("genshin", requestedDate, null));
    }

    @Test
    void archiveHasNoFloorWhenLaunchDateIsUnset() {
        // Empty string is application.properties' local-dev default -
        // must behave exactly as before this feature existed (only the
        // rolling ARCHIVE_WINDOW_DAYS window applies).
        PuzzleController controller = new PuzzleController(null, null, "");

        LocalDate today = PuzzleClock.today();
        String requestedDate = today.minusDays(29).toString();
        assertThrows(NullPointerException.class, // accepted by validation, NPEs on the null puzzleService
            () -> controller.archive("genshin", requestedDate, null));
    }
}
