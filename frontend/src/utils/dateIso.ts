// Local calendar date, not toISOString() (always UTC) - the two disagree for
// hours every day depending on the viewer's time zone and time of day, the
// same off-by-one class of bug ArchiveListPage's own toLocalDateString
// exists to avoid. Shared here since more than one admin date picker needs
// the same today/tomorrow/±1-day arithmetic.
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toLocalDateString(new Date());
}

export function addDays(dateIso: string, delta: number): string {
  const d = new Date(dateIso + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return toLocalDateString(d);
}

// "Aug 24" - shared by ArchiveListPage's date list and ShareResultRow's
// share-card date label, so both read a puzzle date the same way.
export function shortDateLabel(dateIso: string): string {
  return new Date(dateIso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Daily resets at midnight America/Los_Angeles (see backend PuzzleClock),
// not the viewer's own local midnight - this computes that instant as a
// real Date so a countdown works correctly regardless of the viewer's own
// time zone. No timezone library: converts via "format now in the target
// zone, reparse that string in the local zone, diff the two real instants"
// - the resulting offset (target zone's current UTC offset minus the
// browser's own) is exactly what's needed to correct a local-zone midnight
// into the target zone's actual midnight. Gets DST correctness for free
// since toLocaleString always resolves the zone's current offset.
export function nextPacificMidnight(): Date {
  const now = new Date();
  const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const offsetMs = now.getTime() - pacificNow.getTime();
  const nextMidnightPacificWallClock = new Date(
    pacificNow.getFullYear(),
    pacificNow.getMonth(),
    pacificNow.getDate() + 1,
    0, 0, 0, 0
  );
  return new Date(nextMidnightPacificWallClock.getTime() + offsetMs);
}
