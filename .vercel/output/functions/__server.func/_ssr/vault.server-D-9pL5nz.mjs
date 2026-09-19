//#region node_modules/.nitro/vite/services/ssr/assets/vault.server-D-9pL5nz.js
var vault = /* @__PURE__ */ new Map();
function redact(value) {
	return value.replace(/ghp_[A-Za-z0-9]+/g, "[redacted]").replace(/github_pat_[A-Za-z0-9_]+/g, "[redacted]").replace(/gho_[A-Za-z0-9]+/g, "[redacted]");
}
function getEntry(workspaceId) {
	return vault.get(workspaceId);
}
async function githubFetch(pat, path, init = {}) {
	const headers = new Headers(init.headers);
	headers.set("Authorization", `Bearer ${pat}`);
	headers.set("Accept", "application/vnd.github+json");
	headers.set("X-GitHub-Api-Version", "2022-11-28");
	headers.set("User-Agent", "Hive-RO");
	if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
	return fetch(`https://api.github.com${path}`, {
		...init,
		headers
	});
}
function toBase64(text) {
	return Buffer.from(text, "utf8").toString("base64");
}
async function connect(workspaceId, username, pat) {
	try {
		const res = await githubFetch(pat, "/user");
		if (res.status === 401) return {
			ok: false,
			error: "GitHub authentication failed. Update your token in Settings."
		};
		if (!res.ok) return {
			ok: false,
			error: `GitHub could not validate the connection (${res.status}).`
		};
		const user = await res.json();
		const login = user.login || username;
		if (username && user.login && username.toLowerCase() !== user.login.toLowerCase()) return {
			ok: false,
			error: "That username does not match the token. Check Settings and try again."
		};
		vault.set(workspaceId, {
			username: login,
			pat
		});
		return {
			ok: true,
			username: login
		};
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? redact(err.message) : "Connection failed"
		};
	}
}
async function disconnect(workspaceId) {
	vault.delete(workspaceId);
	return { ok: true };
}
async function listRepos(workspaceId) {
	const entry = getEntry(workspaceId);
	if (!entry) return {
		ok: false,
		error: "GitHub is not connected. Add a token in Settings."
	};
	const res = await githubFetch(entry.pat, "/user/repos?per_page=50&sort=updated&affiliation=owner,collaborator");
	if (res.status === 401) {
		vault.delete(workspaceId);
		return {
			ok: false,
			error: "GitHub authentication failed. Update your token in Settings."
		};
	}
	if (!res.ok) return {
		ok: false,
		error: `Could not list repositories (${res.status}).`
	};
	return {
		ok: true,
		repos: (await res.json()).map((r) => ({
			fullName: r.full_name,
			private: r.private,
			description: r.description
		}))
	};
}
async function createRepo(workspaceId, name, isPrivate = true) {
	const entry = getEntry(workspaceId);
	if (!entry) return {
		ok: false,
		error: "GitHub is not connected. Add a token in Settings."
	};
	const safe = name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
	const res = await githubFetch(entry.pat, "/user/repos", {
		method: "POST",
		body: JSON.stringify({
			name: safe,
			private: isPrivate,
			auto_init: true,
			description: "Created by Hive"
		})
	});
	if (!res.ok) return {
		ok: false,
		error: redact(`Could not create repository (${res.status}).`)
	};
	return {
		ok: true,
		fullName: (await res.json()).full_name
	};
}
async function pushFiles(workspaceId, repoFullName, files, message) {
	const entry = getEntry(workspaceId);
	if (!entry) return {
		ok: false,
		error: "GitHub is not connected. Add a token in Settings."
	};
	const [owner, repo] = repoFullName.split("/");
	if (!owner || !repo) return {
		ok: false,
		error: "Choose a repository first."
	};
	const written = [];
	for (const file of files.slice(0, 20)) {
		const path = file.path.replace(/^\/+/, "");
		if (!path || path.includes("..")) continue;
		const encodedPath = path.split("/").map((p) => encodeURIComponent(p)).join("/");
		let sha;
		const existing = await githubFetch(entry.pat, `/repos/${owner}/${repo}/contents/${encodedPath}`);
		if (existing.ok) sha = (await existing.json()).sha;
		const put = await githubFetch(entry.pat, `/repos/${owner}/${repo}/contents/${encodedPath}`, {
			method: "PUT",
			body: JSON.stringify({
				message: message.slice(0, 200) || "Hive: update project",
				content: toBase64(file.content),
				sha
			})
		});
		if (!put.ok) return {
			ok: false,
			error: `RO could not write ${path} (${put.status}).`,
			written
		};
		written.push(path);
	}
	return {
		ok: true,
		written
	};
}
//#endregion
export { connect, createRepo, disconnect, listRepos, pushFiles };
