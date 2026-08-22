package com.tonyl.backend.puzzle;

import java.time.LocalDate;
import java.time.ZoneId;

// Single source of truth for what "today" means for daily puzzle
// generation and archive-window checks - pinned to a specific real IANA
// zone, not the JVM's default (which is just whatever the host machine
// happens to be configured with). A bare LocalDate.now() would reset the
// puzzle at a different, undocumented wall-clock moment depending on
// deployment environment - exactly the class of bug already hit twice in
// this project (UTC-vs-local mismatches between frontend and backend).
// Pinning to a named zone also gets DST correctness for free: ZoneId
// encodes real transition rules, unlike a fixed UTC offset, which would
// need manual adjustment twice a year.
public final class PuzzleClock {

    public static final ZoneId ZONE = ZoneId.of("America/Los_Angeles");

    private PuzzleClock() {
    }

    public static LocalDate today() {
        return LocalDate.now(ZONE);
    }
}
