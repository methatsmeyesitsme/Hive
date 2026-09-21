/**
 * How long an activity took, for the "Recent activity" list.
 *   under 10 s   -> "0.4 s", "9.9 s"
 *   under 1 min  -> "12 s"
 *   1 min and up -> "2m 05s", and "1h 02m" past an hour.
 */
export function formatDuration(ms: number): string {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  if (safe < 10_000) return `${(Math.floor(safe / 100) / 10).toFixed(1)} s`;
  const totalSeconds = Math.floor(safe / 1000);
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
}
