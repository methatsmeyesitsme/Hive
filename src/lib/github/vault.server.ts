/**
 * RO-only GitHub credential vault. Never import this from client code.
 * The PAT never leaves this module: not in return values, logs, or prompts.
 */

type VaultEntry = { username: string; pat: string };
const vault = new Map<string, VaultEntry>();

function redact(value: string): string {
  return value
    .replace(/ghp_[A-Za-z0-9]+/g, "[redacted]")
    .replace(/github_pat_[A-Za-z0-9_]+/g, "[redacted]")
    .replace(/gho_[A-Za-z0-9]+/g, "[redacted]");
}

function getEntry(workspaceId: string): VaultEntry | undefined {
  return vault.get(workspaceId);
}

async function githubFetch(pat: string, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${pat}`);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  headers.set("User-Agent", "Hive-RO");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`https://api.github.com${path}`, { ...init, headers });
}

function toBase64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

export async function connect(
  workspaceId: string,
  username: string,
  pat: string,
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  try {
    const res = await githubFetch(pat, "/user");
    if (res.status === 401) {
      return {
        ok: false,
        error: "GitHub authentication failed. Update your token in Settings.",
      };
    }
    if (!res.ok) {
      return { ok: false, error: `GitHub could not validate the connection (${res.status}).` };
    }
    const user = (await res.json()) as { login?: string };
    const login = user.login || username;
    if (username && user.login && username.toLowerCase() !== user.login.toLowerCase()) {
      return {
        ok: false,
        error: "That username does not match the token. Check Settings and try again.",
      };
    }
    vault.set(workspaceId, { username: login, pat });
    return { ok: true, username: login };
  } catch (err) {
    const message = err instanceof Error ? redact(err.message) : "Connection failed";
    return { ok: false, error: message };
  }
}

export async function disconnect(workspaceId: string): Promise<{ ok: true }> {
  vault.delete(workspaceId);
  return { ok: true };
}

export async function listRepos(workspaceId: string) {
  const entry = getEntry(workspaceId);
  if (!entry) {
    return { ok: false as const, error: "GitHub is not connected. Add a token in Settings." };
  }
  const res = await githubFetch(
    entry.pat,
    "/user/repos?per_page=50&sort=updated&affiliation=owner,collaborator",
  );
  if (res.status === 401) {
    vault.delete(workspaceId);
    return {
      ok: false as const,
      error: "GitHub authentication failed. Update your token in Settings.",
    };
  }
  if (!res.ok) {
    return { ok: false as const, error: `Could not list repositories (${res.status}).` };
  }
  const repos = (await res.json()) as {
    full_name: string;
    private: boolean;
    description: string | null;
  }[];
  return {
    ok: true as const,
    repos: repos.map((r) => ({
      fullName: r.full_name,
      private: r.private,
      description: r.description,
    })),
  };
}

export async function createRepo(workspaceId: string, name: string, isPrivate = true) {
  const entry = getEntry(workspaceId);
  if (!entry) {
    return { ok: false as const, error: "GitHub is not connected. Add a token in Settings." };
  }
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
  const res = await githubFetch(entry.pat, "/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name: safe,
      private: isPrivate,
      auto_init: true,
      description: "Created by Hive",
    }),
  });
  if (!res.ok) {
    return { ok: false as const, error: redact(`Could not create repository (${res.status}).`) };
  }
  const repo = (await res.json()) as { full_name: string };
  return { ok: true as const, fullName: repo.full_name };
}

export async function pushFiles(
  workspaceId: string,
  repoFullName: string,
  files: { path: string; content: string }[],
  message: string,
) {
  const entry = getEntry(workspaceId);
  if (!entry) {
    return { ok: false as const, error: "GitHub is not connected. Add a token in Settings." };
  }
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    return { ok: false as const, error: "Choose a repository first." };
  }

  const written: string[] = [];
  for (const file of files.slice(0, 20)) {
    const path = file.path.replace(/^\/+/, "");
    if (!path || path.includes("..")) continue;
    const encodedPath = path
      .split("/")
      .map((p) => encodeURIComponent(p))
      .join("/");

    let sha: string | undefined;
    const existing = await githubFetch(
      entry.pat,
      `/repos/${owner}/${repo}/contents/${encodedPath}`,
    );
    if (existing.ok) {
      const body = (await existing.json()) as { sha?: string };
      sha = body.sha;
    }

    const put = await githubFetch(
      entry.pat,
      `/repos/${owner}/${repo}/contents/${encodedPath}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message: message.slice(0, 200) || "Hive: update project",
          content: toBase64(file.content),
          sha,
        }),
      },
    );
    if (!put.ok) {
      return { ok: false as const, error: `RO could not write ${path} (${put.status}).`, written };
    }
    written.push(path);
  }

  return { ok: true as const, written };
}
