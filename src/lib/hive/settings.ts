/**
 * Small per-browser settings. Fast mode is on by default.
 *
 * Fast mode: MC writes the site's text (about 0.4 KB) in one model call and Hive
 * renders the page from a template, instead of the model writing the whole page
 * (3-4 KB) after a separate planning call.
 */

const FAST_KEY = "hive-fast-mode";
const listeners = new Set<() => void>();
let fast: boolean | null = null;

function read(): boolean {
  try {
    const v = localStorage.getItem(FAST_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function getFastMode(): boolean {
  if (fast === null) fast = read();
  return fast;
}

export function setFastMode(on: boolean) {
  fast = on;
  try {
    localStorage.setItem(FAST_KEY, on ? "1" : "0");
  } catch {
    // storage unavailable: applies for this page load only
  }
  for (const fn of listeners) fn();
}

export function subscribeSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
