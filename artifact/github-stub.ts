/**
 * The hosted preview is a static page, so the server-side GitHub token vault
 * is not available. Tokens are never accepted in the browser.
 */
const unavailable = {
  ok: false as const,
  error: "GitHub isn't available in the hosted preview. Use the deployed Hive app for GitHub.",
};

export async function connectGithub(_input: unknown) {
  return unavailable;
}
export async function disconnectGithub(_input: unknown) {
  return { ok: true as const };
}
export async function listGithubRepos(_input: unknown) {
  return unavailable;
}
export async function createGithubRepo(_input: unknown) {
  return unavailable;
}
export async function pushToGithub(_input: unknown) {
  return unavailable;
}
