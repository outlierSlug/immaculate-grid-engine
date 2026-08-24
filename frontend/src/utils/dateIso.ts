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
