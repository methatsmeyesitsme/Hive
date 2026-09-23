/**
 * Hive's version, shown in Settings and the sidebar logo. It goes up by 0.01 for every GitHub push
 * (1.0 -> 1.1 -> ... -> 1.9 -> 2.0 -> 2.1). Change it in the same commit as the work.
 */
export const APP_VERSION = "3.46";

/** The next version after version, counting in steps of 0.1. */
export function nextVersion(version: string): string {
  const [majorText, minorText = "0"] = version.split(".");
  const major = Number(majorText);
  const places = minorText.length;
  const base = 10 ** places;
  const minor = Number(minorText);
  const next = major * base + minor + 1;
  const nextMajor = Math.floor(next / base);
  const nextMinor = next % base;
  return places === 1
    ? `${nextMajor}.${nextMinor}`
    : `${nextMajor}.${String(nextMinor).padStart(places, "0")}`;
}
