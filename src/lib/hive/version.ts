/**
 * Hive's version, shown in Settings and the sidebar logo. It goes up by 0.1 with every push or update
 * (1.0 -> 1.1 -> ... -> 1.9 -> 2.0 -> 2.1). Change it in the same commit as the work.
 */
export const APP_VERSION = "2.2";

/** The next version after version, counting in steps of 0.1. */
export function nextVersion(version: string): string {
  const [major, minor] = version.split(".").map(Number);
  const tenths = major * 10 + minor + 1;
  return String(Math.floor(tenths / 10)) + "." + String(tenths % 10);
}
