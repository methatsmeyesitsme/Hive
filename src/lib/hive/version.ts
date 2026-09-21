/**
 * Hive's version, shown in Settings. It goes up by 0.1 with every push or update
 * (1.0 -> 1.1 -> ... -> 1.9 -> 2.0). Change it in the same commit as the work.
 */
export const APP_VERSION = "1.6";

/** The next version after `version`, counting in steps of 0.1 (1.9 -> 2.0). */
export function nextVersion(version: string): string {
  const [major, minor] = version.split(".").map(Number);
  const tenths = major * 10 + minor + 1;
  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
}