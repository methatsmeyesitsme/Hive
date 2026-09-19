import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-BLawcmEM.js
var connectGithub_createServerFn_handler = createServerRpc({
	id: "440d4bea8f2bc716724541ab91cdfa4d20cc9a4114b6c3144bc42f4590bed57c",
	name: "connectGithub",
	filename: "src/lib/github/api.ts"
}, (opts) => connectGithub.__executeServer(opts));
var connectGithub = createServerFn({ method: "POST" }).validator((input) => {
	if (!input.workspaceId?.trim()) throw new Error("Missing workspace");
	if (!input.pat?.trim()) throw new Error("Personal access token is required");
	return {
		workspaceId: input.workspaceId.trim(),
		username: input.username.trim(),
		pat: input.pat.trim()
	};
}).handler(connectGithub_createServerFn_handler, async ({ data }) => {
	return (await import("./vault.server-D-9pL5nz.mjs")).connect(data.workspaceId, data.username, data.pat);
});
var disconnectGithub_createServerFn_handler = createServerRpc({
	id: "ad9578e0be76f01ade7c50a8857df092ba4350ce764a58ea2912787b7bfdf67f",
	name: "disconnectGithub",
	filename: "src/lib/github/api.ts"
}, (opts) => disconnectGithub.__executeServer(opts));
var disconnectGithub = createServerFn({ method: "POST" }).validator((input) => input).handler(disconnectGithub_createServerFn_handler, async ({ data }) => {
	return (await import("./vault.server-D-9pL5nz.mjs")).disconnect(data.workspaceId);
});
var listGithubRepos_createServerFn_handler = createServerRpc({
	id: "40c0fc4d29423fe466bb9dbe95a771868d1c4eb3b353ab0b50ea965a21978c25",
	name: "listGithubRepos",
	filename: "src/lib/github/api.ts"
}, (opts) => listGithubRepos.__executeServer(opts));
var listGithubRepos = createServerFn({ method: "POST" }).validator((input) => input).handler(listGithubRepos_createServerFn_handler, async ({ data }) => {
	return (await import("./vault.server-D-9pL5nz.mjs")).listRepos(data.workspaceId);
});
var createGithubRepo_createServerFn_handler = createServerRpc({
	id: "ae01713038155b9f6fc04299dbfc28851d8c04c070921b08720e55410c015ff0",
	name: "createGithubRepo",
	filename: "src/lib/github/api.ts"
}, (opts) => createGithubRepo.__executeServer(opts));
var createGithubRepo = createServerFn({ method: "POST" }).validator((input) => input).handler(createGithubRepo_createServerFn_handler, async ({ data }) => {
	return (await import("./vault.server-D-9pL5nz.mjs")).createRepo(data.workspaceId, data.name, data.isPrivate !== false);
});
var pushToGithub_createServerFn_handler = createServerRpc({
	id: "c22df387c1702c564e507c67046e758851e33dbd88a4a711e10ab115dd098d10",
	name: "pushToGithub",
	filename: "src/lib/github/api.ts"
}, (opts) => pushToGithub.__executeServer(opts));
var pushToGithub = createServerFn({ method: "POST" }).validator((input) => input).handler(pushToGithub_createServerFn_handler, async ({ data }) => {
	return (await import("./vault.server-D-9pL5nz.mjs")).pushFiles(data.workspaceId, data.repoFullName, data.files, data.message);
});
//#endregion
export { connectGithub_createServerFn_handler, createGithubRepo_createServerFn_handler, disconnectGithub_createServerFn_handler, listGithubRepos_createServerFn_handler, pushToGithub_createServerFn_handler };
