import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as DialogOverlay$1, f as Slot, i as DialogDescription$1, n as DialogClose, o as DialogPortal, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { _ as Download, a as Square, b as ArrowRight, c as Send, d as Play, f as Paperclip, g as Folder, h as LogOut, i as Trash2, l as Radio, m as Menu, n as Upload, o as Snowflake, p as PanelLeft, s as Settings, t as X, u as Plus, v as Copy, y as BookOpen } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { i as Viewport, n as Scrollbar, r as Thumb, t as Root } from "../_libs/radix-ui__react-scroll-area.mjs";
import { n as persist, r as create, t as createJSONStorage } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-pRgeoGGp.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function nid(prefix = "") {
	const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
	return prefix ? `${prefix}_${id}` : id;
}
function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1048576).toFixed(1)} MB`;
}
function relativeTime(ts) {
	const delta = Date.now() - ts;
	if (delta < 15e3) return "just now";
	if (delta < 6e4) return `${Math.floor(delta / 1e3)}s ago`;
	if (delta < 36e5) return `${Math.floor(delta / 6e4)}m ago`;
	if (delta < 864e5) return `${Math.floor(delta / 36e5)}h ago`;
	return new Date(ts).toLocaleDateString();
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[opacity,transform,background-color,color,border-color] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey/60 focus-visible:ring-offset-2 focus-visible:ring-offset-navy [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-honey text-navy hover:bg-honey-2",
			secondary: "bg-navy-3 text-fog border border-line hover:border-line-strong hover:bg-navy-4",
			ghost: "text-mist hover:text-fog hover:bg-navy-3",
			danger: "bg-danger/15 text-danger hover:bg-danger/25",
			outline: "border border-line bg-transparent text-fog hover:border-honey/40 hover:text-honey"
		},
		size: {
			default: "h-10 px-4 text-sm",
			sm: "h-8 px-3 text-xs",
			lg: "h-11 px-5 text-sm",
			icon: "size-10",
			"icon-sm": "size-8"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
function ScrollArea({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Root, {
		className: cn("overflow-hidden", className),
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Viewport, {
			className: "h-full w-full",
			children
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scrollbar, {
			orientation: "vertical",
			className: "flex w-2 touch-none select-none p-0.5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thumb, { className: "relative flex-1 rounded-full bg-line-strong" })
		})]
	});
}
function HiveMark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 32 32",
		className: cn("size-7", className),
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M16 3.2 27.2 9.6v12.8L16 28.8 4.8 22.4V9.6L16 3.2Z",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.6",
			strokeLinejoin: "round"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M16 10.2 21.4 13.3v6.4L16 22.8 10.6 19.7v-6.4L16 10.2Z",
			fill: "currentColor",
			opacity: "0.85"
		})]
	});
}
function HiveWordmark({ collapsed = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2.5 text-honey",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HiveMark, {}), !collapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-display text-lg font-semibold tracking-[0.18em] text-fog",
			children: "HIVE"
		})]
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var runMcTask = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("60068ea21edc6d1f9b5000c7a0d0863938c46a697fdc1477853cf07f89c72530"));
var getAiStatus = createServerFn({ method: "POST" }).handler(createSsrRpc("282f807e3d8c922996624d7a43c7f9121a5b5d83a5b628aeb75989d06624184b"));
var connectGithub = createServerFn({ method: "POST" }).validator((input) => {
	if (!input.workspaceId?.trim()) throw new Error("Missing workspace");
	if (!input.pat?.trim()) throw new Error("Personal access token is required");
	return {
		workspaceId: input.workspaceId.trim(),
		username: input.username.trim(),
		pat: input.pat.trim()
	};
}).handler(createSsrRpc("440d4bea8f2bc716724541ab91cdfa4d20cc9a4114b6c3144bc42f4590bed57c"));
var disconnectGithub = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("ad9578e0be76f01ade7c50a8857df092ba4350ce764a58ea2912787b7bfdf67f"));
var listGithubRepos = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("40c0fc4d29423fe466bb9dbe95a771868d1c4eb3b353ab0b50ea965a21978c25"));
var createGithubRepo = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("ae01713038155b9f6fc04299dbfc28851d8c04c070921b08720e55410c015ff0"));
var pushToGithub = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("c22df387c1702c564e507c67046e758851e33dbd88a4a711e10ab115dd098d10"));
var LI_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
var STORAGE_KEY = "hive-workspace-v1";
/**
* HRC allocation. The only legal path to decide swarm size.
* Rejects a 27th Li by deleting it and pausing production.
*/
function hrcAllocate(requested) {
	if (requested.length > 26) return {
		ok: false,
		paused: true,
		reason: "A 27th Li was attempted and immediately deleted. Production has been paused for investigation."
	};
	const usedLetters = /* @__PURE__ */ new Set();
	const lieutenants = [];
	let totalAgents = 0;
	for (const li of requested) {
		if (lieutenants.length >= 26) return {
			ok: false,
			paused: true,
			reason: "A 27th Li was attempted and immediately deleted. Production has been paused for investigation."
		};
		const letter = (li.letter || LI_LETTERS[lieutenants.length] || "A").slice(0, 1).toUpperCase();
		if (usedLetters.has(letter) || !LI_LETTERS.includes(letter)) {
			const next = LI_LETTERS.find((l) => !usedLetters.has(l));
			if (!next) return {
				ok: false,
				paused: true,
				reason: "A 27th Li was attempted and immediately deleted. Production has been paused for investigation."
			};
			usedLetters.add(next);
			const agentCount = clampAgents(li.agentCount, totalAgents);
			totalAgents += agentCount;
			lieutenants.push({
				...li,
				letter: next,
				agentCount
			});
			continue;
		}
		usedLetters.add(letter);
		const agentCount = clampAgents(li.agentCount, totalAgents);
		totalAgents += agentCount;
		lieutenants.push({
			...li,
			letter,
			agentCount
		});
	}
	if (totalAgents > 650) return scaleToCap(lieutenants);
	return {
		ok: true,
		paused: false,
		lieutenants,
		totalAgents
	};
}
function clampAgents(requested, already) {
	const n = Math.max(1, Math.min(25, Math.floor(requested || 1)));
	const remaining = 650 - already;
	return Math.max(0, Math.min(n, remaining));
}
function scaleToCap(lieutenants) {
	let total = lieutenants.reduce((s, l) => s + l.agentCount, 0);
	const scaled = lieutenants.map((l) => ({ ...l }));
	let i = 0;
	while (total > 650 && i < 1e4) {
		const idx = i % scaled.length;
		if (scaled[idx].agentCount > 1) {
			scaled[idx].agentCount -= 1;
			total -= 1;
		}
		i += 1;
	}
	return {
		ok: true,
		paused: false,
		lieutenants: scaled,
		totalAgents: total
	};
}
/** Software lock: only one worker may edit a given file at a time. */
function acquireLock(locks, path, ownerId, ownerLabel) {
	const current = locks.get(path);
	if (current && current.ownerId !== ownerId) return false;
	locks.set(path, {
		ownerId,
		ownerLabel
	});
	return true;
}
/**
* Provisional HRC estimate used before MC's plan returns.
* Never exceeds hard limits.
*/
function estimateSwarm(prompt) {
	const text = prompt.toLowerCase();
	let liCount = 2;
	if (/landing|website|app|dashboard|shop|store|auth|account|full|rebuild/.test(text)) liCount = 3;
	if (/and then|also|plus|multi|complex|platform|hive/.test(text)) liCount = Math.min(5, liCount + 1);
	if (/fix|typo|color|copy|tiny|small/.test(text) && prompt.length < 80) liCount = 1;
	const templates = [
		{
			objective: "Structure, shell, and primary layout",
			files: ["index.html"]
		},
		{
			objective: "Visual design, typography, and motion",
			files: ["styles"]
		},
		{
			objective: "Interactive sections and content modules",
			files: ["sections"]
		},
		{
			objective: "Responsive behavior and polish",
			files: ["responsive"]
		},
		{
			objective: "Edge cases, empty states, and QA fixes",
			files: ["qa"]
		}
	];
	return Array.from({ length: liCount }, (_, i) => {
		const t = templates[i] ?? {
			objective: `Support track ${LI_LETTERS[i]}`,
			files: [`track-${LI_LETTERS[i]}`]
		};
		return {
			letter: LI_LETTERS[i],
			objective: t.objective,
			agentCount: Math.min(25, 3 + i % 3),
			files: t.files
		};
	});
}
var idleStatus = {
	mc: "Standing by",
	hrc: "Standing by",
	ro: "Standing by"
};
var memoryStorage = createJSONStorage(() => {
	if (typeof window === "undefined") return {
		getItem: () => null,
		setItem: () => {},
		removeItem: () => {}
	};
	return localStorage;
});
var abortRun = null;
var lockMap = /* @__PURE__ */ new Map();
function audit(actor, action) {
	return {
		id: nid("aud"),
		at: Date.now(),
		actor,
		action
	};
}
function sleep(ms, signal) {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException("Aborted", "AbortError"));
			return;
		}
		const t = window.setTimeout(resolve, ms);
		const onAbort = () => {
			window.clearTimeout(t);
			reject(new DOMException("Aborted", "AbortError"));
		};
		signal.addEventListener("abort", onAbort, { once: true });
	});
}
function newProject(name, repoFullName = null) {
	const now = Date.now();
	return {
		id: nid("prj"),
		name,
		createdAt: now,
		updatedAt: now,
		messages: [],
		artifact: null,
		repoFullName
	};
}
var useHiveStore = create()(persist((set, get) => ({
	hydrated: false,
	workspaceId: nid("ws"),
	sessionName: null,
	view: "workspace",
	leftCollapsed: false,
	rightCollapsed: false,
	rightOpenMobile: false,
	leftOpenMobile: false,
	previewOpen: false,
	previewRunning: false,
	aiAvailable: null,
	projects: [],
	activeProjectId: null,
	phase: "idle",
	status: idleStatus,
	lieutenants: [],
	agentTotal: 0,
	fileLocks: [],
	pauseReason: null,
	frozen: false,
	audits: [],
	runId: null,
	memories: [],
	githubConnected: false,
	githubUsername: "",
	githubRepo: null,
	githubRepos: [],
	githubBusy: false,
	githubError: null,
	pushBusy: false,
	activeProject: () => {
		const { projects, activeProjectId } = get();
		return projects.find((p) => p.id === activeProjectId) ?? null;
	},
	enterWorkspace: (name) => {
		const trimmed = name.trim().slice(0, 48);
		if (!trimmed) return;
		const { projects } = get();
		if (projects.length === 0) {
			const project = newProject("Untitled project");
			set({
				sessionName: trimmed,
				projects: [project],
				activeProjectId: project.id,
				view: "workspace"
			});
			return;
		}
		set({
			sessionName: trimmed,
			view: "workspace"
		});
	},
	logout: () => {
		abortRun?.abort();
		abortRun = null;
		set({
			sessionName: null,
			view: "workspace",
			phase: "idle",
			status: idleStatus,
			lieutenants: [],
			agentTotal: 0,
			previewOpen: false,
			previewRunning: false
		});
	},
	setView: (view) => set({
		view,
		leftOpenMobile: false
	}),
	toggleLeft: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
	toggleRight: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
	setLeftOpenMobile: (open) => set({ leftOpenMobile: open }),
	setRightOpenMobile: (open) => set({ rightOpenMobile: open }),
	setPreviewOpen: (open) => set({ previewOpen: open }),
	runPreview: () => set({
		previewRunning: true,
		previewOpen: true
	}),
	createProject: (name, repoFullName) => {
		abortRun?.abort();
		abortRun = null;
		const project = newProject(name?.trim() || "Untitled project", repoFullName ?? get().githubRepo);
		set((s) => ({
			projects: [project, ...s.projects],
			activeProjectId: project.id,
			view: "workspace",
			phase: "idle",
			status: idleStatus,
			lieutenants: [],
			agentTotal: 0,
			fileLocks: [],
			pauseReason: null,
			frozen: false,
			previewOpen: false,
			previewRunning: false,
			leftOpenMobile: false,
			audits: [audit("MC", `Opened project “${project.name}”`), ...s.audits].slice(0, 80)
		}));
	},
	selectProject: (id) => {
		abortRun?.abort();
		abortRun = null;
		set({
			activeProjectId: id,
			view: "workspace",
			phase: "idle",
			status: idleStatus,
			lieutenants: [],
			agentTotal: 0,
			fileLocks: [],
			pauseReason: null,
			frozen: false,
			previewRunning: false,
			leftOpenMobile: false
		});
	},
	renameProject: (id, name) => {
		const trimmed = name.trim().slice(0, 64);
		if (!trimmed) return;
		set((s) => ({ projects: s.projects.map((p) => p.id === id ? {
			...p,
			name: trimmed,
			updatedAt: Date.now()
		} : p) }));
	},
	deleteProject: (id) => {
		set((s) => {
			const projects = s.projects.filter((p) => p.id !== id);
			return {
				projects,
				activeProjectId: s.activeProjectId === id ? projects[0]?.id ?? null : s.activeProjectId
			};
		});
	},
	send: async (text, attachments) => {
		const prompt = text.trim();
		if (!prompt && attachments.length === 0) return;
		const state = get();
		if (state.frozen) return;
		if (state.phase !== "idle" && state.phase !== "complete" && state.phase !== "cancelled" && state.phase !== "error") return;
		let project = state.activeProject();
		if (!project) {
			const created = newProject("Untitled project");
			set({
				projects: [created, ...state.projects],
				activeProjectId: created.id
			});
			project = created;
		}
		abortRun?.abort();
		const controller = new AbortController();
		abortRun = controller;
		const signal = controller.signal;
		const runId = nid("run");
		lockMap.clear();
		const userMsg = {
			id: nid("msg"),
			role: "user",
			content: prompt || "(attachments)",
			createdAt: Date.now(),
			attachments
		};
		const patchProject = (fn) => {
			set((s) => ({ projects: s.projects.map((p) => p.id === project.id ? fn(p) : p) }));
		};
		patchProject((p) => ({
			...p,
			messages: [...p.messages, userMsg],
			updatedAt: Date.now(),
			artifact: p.artifact ? {
				...p.artifact,
				ready: false
			} : p.artifact
		}));
		const provisional = estimateSwarm(prompt);
		set({
			runId,
			phase: "planning",
			previewRunning: false,
			pauseReason: null,
			status: {
				mc: "Planning the requested changes",
				hrc: "Waiting for objective",
				ro: state.githubConnected ? "Reviewing repository context" : "Standing by"
			},
			lieutenants: [],
			agentTotal: 0,
			fileLocks: [],
			audits: [audit("MC", "Received the human’s original request"), ...get().audits].slice(0, 80)
		});
		const apiPromise = runMcTask({ data: {
			prompt,
			history: project.messages.filter((m) => m.role === "user" || m.role === "mc").map((m) => ({
				role: m.role === "mc" ? "mc" : "user",
				content: m.content
			})),
			attachments: attachments.map((a) => ({
				name: a.name,
				mime: a.mime,
				kind: a.kind,
				dataUrl: a.kind === "image" ? a.dataUrl : void 0,
				textExcerpt: a.textExcerpt
			})),
			memory: get().memories.slice(0, 12).map((m) => ({
				title: m.title,
				content: m.content
			})),
			currentHtml: project.artifact?.html ?? null,
			projectName: project.name
		} });
		const fail = (message) => {
			if (signal.aborted) return;
			const sys = {
				id: nid("msg"),
				role: "mc",
				content: message,
				createdAt: Date.now()
			};
			patchProject((p) => ({
				...p,
				messages: [...p.messages, sys],
				updatedAt: Date.now()
			}));
			set({
				phase: "error",
				status: {
					mc: "Could not complete the run",
					hrc: "Standing by",
					ro: "Standing by"
				},
				audits: [audit("MC", "Run failed"), ...get().audits].slice(0, 80)
			});
		};
		try {
			await sleep(700, signal);
			if (get().runId !== runId) return;
			set({
				phase: "dispatching",
				status: {
					mc: "Sending the overall objective to HRC and RO",
					hrc: "Receiving objective",
					ro: "Receiving objective"
				},
				audits: [
					audit("MC", "Sent overall objective to HRC"),
					audit("MC", "Sent overall objective to RO"),
					...get().audits
				].slice(0, 80)
			});
			await sleep(650, signal);
			const pre = hrcAllocate(provisional);
			if (!pre.ok) {
				set({
					phase: "paused",
					pauseReason: pre.reason,
					status: {
						mc: "Production paused",
						hrc: "27th Li deleted — investigation",
						ro: "Standing by"
					}
				});
				fail(pre.reason);
				return;
			}
			set({
				phase: "allocating",
				status: {
					mc: "Waiting for swarm readiness",
					hrc: `Allocating ${pre.totalAgents} agents across ${pre.lieutenants.length} Li`,
					ro: pre.lieutenants.length > 2 ? "Preparing research channels" : "Standing by"
				}
			});
			await sleep(700, signal);
			set({
				phase: "summoning",
				status: {
					...get().status,
					hrc: "Summoning Li"
				}
			});
			const summoned = [];
			for (const li of pre.lieutenants) {
				if (signal.aborted) return;
				summoned.push({
					letter: li.letter,
					objective: li.objective,
					activity: "Coming online",
					agentAllowance: li.agentCount,
					permissionGranted: true,
					agents: [],
					status: "summoning"
				});
				set({
					lieutenants: [...summoned],
					status: {
						...get().status,
						hrc: `Summoned Li ${li.letter} · allowance ${li.agentCount}`
					},
					audits: [audit("HRC", `Summoned Li ${li.letter} with allowance ${li.agentCount}`), ...get().audits].slice(0, 80)
				});
				await sleep(220, signal);
			}
			let agentTotal = 0;
			for (let i = 0; i < summoned.length; i++) {
				const li = summoned[i];
				const plan = pre.lieutenants[i];
				for (let n = 0; n < li.agentAllowance; n++) {
					if (signal.aborted) return;
					const agentId = nid("ag");
					const file = plan.files[n % Math.max(1, plan.files.length)] || `work/${li.letter}/${n + 1}`;
					acquireLock(lockMap, file, agentId, `Li ${li.letter} · agent ${n + 1}`);
					li.agents.push({
						id: agentId,
						liLetter: li.letter,
						assignment: plan.objective,
						status: "working",
						ownedFiles: [file]
					});
					agentTotal += 1;
					li.activity = `Managing ${li.agents.length} agents`;
					li.status = "working";
					set({
						lieutenants: summoned.map((x) => ({
							...x,
							agents: [...x.agents]
						})),
						agentTotal,
						fileLocks: [...lockMap.entries()].map(([path, v]) => ({
							path,
							ownerId: v.ownerId,
							ownerLabel: v.ownerLabel
						})),
						status: {
							mc: "Waiting for swarm readiness",
							hrc: `Managing ${agentTotal} active agents`,
							ro: get().status.ro
						}
					});
					await sleep(70, signal);
				}
			}
			set({
				phase: "distributing",
				status: {
					mc: "Distributing designated objectives",
					hrc: "All required Li and agents created",
					ro: "Memory standing by"
				},
				audits: [
					audit("HRC", "Notified MC that the swarm is ready"),
					audit("MC", "Distributed designated objectives to Li"),
					...get().audits
				].slice(0, 80)
			});
			await sleep(500, signal);
			set({
				phase: "working",
				status: {
					mc: "Monitoring mini-swarms",
					hrc: `Managing ${agentTotal} active agents`,
					ro: "Standing by"
				}
			});
			const result = await apiPromise;
			if (signal.aborted || get().runId !== runId) return;
			if (!result.ok) {
				fail(result.error);
				return;
			}
			const allocated = hrcAllocate(result.plan.lieutenants);
			if (!allocated.ok) {
				set({
					phase: "paused",
					pauseReason: allocated.reason,
					lieutenants: [],
					agentTotal: 0,
					status: {
						mc: "Production paused",
						hrc: "27th Li deleted — investigation",
						ro: "Standing by"
					}
				});
				fail(allocated.reason);
				return;
			}
			const merged = allocated.lieutenants.map((li, idx) => {
				const agents = summoned[idx]?.agents.map((a) => ({
					...a,
					assignment: li.objective,
					status: "working"
				})) ?? Array.from({ length: li.agentCount }, (_, n) => ({
					id: nid("ag"),
					liLetter: li.letter,
					assignment: li.objective,
					status: "working",
					ownedFiles: li.files.slice(0, 1)
				}));
				return {
					letter: li.letter,
					objective: li.objective,
					activity: `Managing ${agents.length} agents`,
					agentAllowance: li.agentCount,
					permissionGranted: true,
					agents,
					status: "working"
				};
			});
			const liveTotal = merged.reduce((s, l) => s + l.agents.length, 0);
			set({
				lieutenants: merged,
				agentTotal: liveTotal,
				status: {
					mc: result.plan.objective.slice(0, 64),
					hrc: `Managing ${liveTotal} active agents`,
					ro: result.plan.researchNeeded ? `Researching ${result.plan.researchTopic || "external context"}` : "Standing by"
				}
			});
			if (result.plan.researchNeeded) {
				set({
					phase: "researching",
					status: {
						mc: "Distributing RO findings",
						hrc: `Managing ${liveTotal} active agents`,
						ro: `Researching ${result.plan.researchTopic || "the open web"}`
					},
					audits: [
						audit("RO", `Web research: ${result.plan.researchTopic || "context"}`),
						audit("RO", "Returned findings directly to requesting agents"),
						audit("MC", "Distributed relevant new information to Li"),
						...get().audits
					].slice(0, 80)
				});
				await sleep(900, signal);
			}
			set({
				phase: "working",
				status: {
					mc: "Agents implementing assigned work",
					hrc: `Managing ${liveTotal} active agents`,
					ro: "Standing by"
				}
			});
			const workTicks = 5;
			for (let t = 0; t < workTicks; t++) {
				if (signal.aborted) return;
				set((s) => ({ lieutenants: s.lieutenants.map((li, i) => ({
					...li,
					activity: t === 4 ? "Reviewing agent work" : [
						`Managing ${li.agents.length} agents`,
						"Answering non-web questions",
						"Checking file ownership",
						"Collecting completed assignments"
					][(t + i) % 4],
					agents: li.agents.map((a, n) => ({
						...a,
						status: t > 2 && n % 3 === t % 3 ? "done" : t === 1 && n % 5 === 0 ? "research" : "working"
					}))
				})) }));
				await sleep(420, signal);
			}
			set({
				phase: "reviewing",
				status: {
					mc: "Receiving compiled Li results",
					hrc: "Holding population steady",
					ro: "Standing by"
				},
				lieutenants: get().lieutenants.map((li) => ({
					...li,
					status: "reviewing",
					activity: "Stitching mini-swarm work",
					agents: li.agents.map((a) => ({
						...a,
						status: "done"
					}))
				}))
			});
			await sleep(700, signal);
			set({
				phase: "integrating",
				status: {
					mc: `Integrating ${merged.map((l) => `Li ${l.letter}`).join(" and ")}`,
					hrc: "Standing down spare capacity",
					ro: "Waiting for knowledge extraction"
				},
				lieutenants: get().lieutenants.map((li) => ({
					...li,
					status: "done",
					activity: "Compiled result sent to MC"
				})),
				audits: [
					audit("Li", "Sent compiled mini-swarm results to MC"),
					audit("MC", "Performing final integration"),
					...get().audits
				].slice(0, 80)
			});
			await sleep(750, signal);
			lockMap.clear();
			set({
				phase: "extracting",
				fileLocks: [],
				status: {
					mc: "Presenting completed work",
					hrc: "Swarm idle",
					ro: "Storing useful knowledge in memory"
				}
			});
			for (const mem of result.memory) get().addMemory(mem);
			if (result.artifact) get().addMemory({
				title: `Completed: ${result.artifact.title}`,
				content: result.plan.objective,
				source: "work"
			});
			await sleep(400, signal);
			if (signal.aborted || get().runId !== runId) return;
			const mcMsg = {
				id: nid("msg"),
				role: "mc",
				content: result.mcMessage,
				createdAt: Date.now(),
				hasArtifact: Boolean(result.artifact)
			};
			const artifact = result.artifact ? {
				...result.artifact,
				ready: true
			} : get().activeProject()?.artifact ?? null;
			patchProject((p) => ({
				...p,
				messages: [...p.messages, mcMsg],
				artifact,
				updatedAt: Date.now(),
				name: p.name === "Untitled project" && result.artifact?.title ? result.artifact.title.slice(0, 48) : p.name
			}));
			set({
				phase: "complete",
				agentTotal: 0,
				previewRunning: false,
				status: {
					mc: "Work presented to the human",
					hrc: "Standing by",
					ro: "Standing by"
				},
				audits: [audit("MC", "Presented completed work"), ...get().audits].slice(0, 80)
			});
		} catch (err) {
			if (err instanceof DOMException && err.name === "AbortError") return;
			fail("Something went wrong while Hive was working. Try again.");
		}
	},
	cancel: () => {
		abortRun?.abort();
		abortRun = null;
		lockMap.clear();
		const project = get().activeProject();
		if (project) {
			const msg = {
				id: nid("msg"),
				role: "mc",
				content: "Cancelled. Hive stopped further deployment. Completed work is still here — nothing was deleted.",
				createdAt: Date.now()
			};
			set((s) => ({ projects: s.projects.map((p) => p.id === project.id ? {
				...p,
				messages: [...p.messages, msg],
				updatedAt: Date.now()
			} : p) }));
		}
		set({
			phase: "cancelled",
			status: {
				mc: "Acknowledged cancellation",
				hrc: "Stopped further swarm deployment",
				ro: "Standing by"
			},
			agentTotal: 0,
			fileLocks: [],
			previewRunning: false,
			audits: [audit("MC", "Run cancelled by human"), ...get().audits].slice(0, 80)
		});
	},
	freeze: () => {
		abortRun?.abort();
		abortRun = null;
		lockMap.clear();
		set({
			frozen: true,
			phase: "frozen",
			status: {
				mc: "Emergency freeze",
				hrc: "Population frozen",
				ro: "GitHub operations frozen"
			},
			agentTotal: 0,
			fileLocks: [],
			audits: [audit("HRC", "Emergency freeze engaged"), ...get().audits].slice(0, 80)
		});
	},
	addMemory: (entry) => {
		const item = {
			id: nid("mem"),
			createdAt: Date.now(),
			editable: true,
			...entry
		};
		set((s) => ({
			memories: [item, ...s.memories].slice(0, 80),
			audits: [audit("RO", `Memory: ${item.title}`), ...s.audits].slice(0, 80)
		}));
	},
	updateMemory: (id, patch) => {
		set((s) => ({ memories: s.memories.map((m) => m.id === id ? {
			...m,
			...patch
		} : m) }));
	},
	deleteMemory: (id) => {
		set((s) => ({ memories: s.memories.filter((m) => m.id !== id) }));
	},
	checkAi: async () => {
		try {
			set({ aiAvailable: (await getAiStatus()).available });
		} catch {
			set({ aiAvailable: false });
		}
	},
	connectGithub: async (username, pat) => {
		set({
			githubBusy: true,
			githubError: null
		});
		try {
			const res = await connectGithub({ data: {
				workspaceId: get().workspaceId,
				username,
				pat
			} });
			if (!res.ok) {
				set({
					githubBusy: false,
					githubError: res.error,
					githubConnected: false
				});
				return false;
			}
			set({
				githubBusy: false,
				githubConnected: true,
				githubUsername: res.username,
				githubError: null,
				audits: [audit("RO", `GitHub connected as ${res.username}`), ...get().audits].slice(0, 80)
			});
			await get().refreshRepos();
			return true;
		} catch {
			set({
				githubBusy: false,
				githubError: "GitHub authentication failed. Try again from Settings."
			});
			return false;
		}
	},
	disconnectGithub: async () => {
		await disconnectGithub({ data: { workspaceId: get().workspaceId } });
		set({
			githubConnected: false,
			githubUsername: "",
			githubRepo: null,
			githubRepos: [],
			githubError: null
		});
	},
	refreshRepos: async () => {
		if (!get().githubConnected) return;
		set({ githubBusy: true });
		const res = await listGithubRepos({ data: { workspaceId: get().workspaceId } });
		if (!res.ok) {
			set({
				githubBusy: false,
				githubError: res.error
			});
			return;
		}
		set({
			githubBusy: false,
			githubRepos: res.repos,
			githubError: null
		});
	},
	createRepo: async (name) => {
		set({
			githubBusy: true,
			githubError: null
		});
		const res = await createGithubRepo({ data: {
			workspaceId: get().workspaceId,
			name,
			isPrivate: true
		} });
		if (!res.ok) {
			set({
				githubBusy: false,
				githubError: res.error
			});
			return null;
		}
		set({
			githubBusy: false,
			githubRepo: res.fullName
		});
		await get().refreshRepos();
		return res.fullName;
	},
	setGithubRepo: (fullName) => {
		set({ githubRepo: fullName });
		const project = get().activeProject();
		if (project) set((s) => ({ projects: s.projects.map((p) => p.id === project.id ? {
			...p,
			repoFullName: fullName
		} : p) }));
	},
	pushApprovedWork: async () => {
		const project = get().activeProject();
		const repo = project?.repoFullName || get().githubRepo;
		if (!project?.artifact || !repo) return {
			ok: false,
			error: "Connect a repository and finish work before pushing."
		};
		set({ pushBusy: true });
		const files = project.artifact.files.length > 0 ? project.artifact.files : [{
			path: "index.html",
			content: project.artifact.html
		}];
		const res = await pushToGithub({ data: {
			workspaceId: get().workspaceId,
			repoFullName: repo,
			files,
			message: `Hive: ${project.artifact.title}`
		} });
		set({ pushBusy: false });
		if (!res.ok) return {
			ok: false,
			error: res.error
		};
		set((s) => ({ audits: [audit("RO", `Pushed approved work to ${repo}`), ...s.audits].slice(0, 80) }));
		return { ok: true };
	}
}), {
	name: STORAGE_KEY,
	storage: memoryStorage,
	partialize: (s) => ({
		workspaceId: s.workspaceId,
		sessionName: s.sessionName,
		leftCollapsed: s.leftCollapsed,
		rightCollapsed: s.rightCollapsed,
		projects: s.projects,
		activeProjectId: s.activeProjectId,
		memories: s.memories,
		githubUsername: s.githubUsername,
		githubRepo: s.githubRepo
	}),
	onRehydrateStorage: () => () => {
		useHiveStore.setState({
			hydrated: true,
			phase: "idle",
			status: idleStatus,
			lieutenants: [],
			agentTotal: 0,
			frozen: false,
			previewRunning: false,
			githubConnected: false
		});
	}
}));
var Dialog = Dialog$1;
function DialogOverlay({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
		className: cn("fixed inset-0 z-50 bg-navy/80 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200", className),
		...props
	});
}
function DialogContent({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
		className: cn("fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2", "rounded-xl border border-line bg-navy-2 p-5 shadow-panel", "data-[state=open]:opacity-100 data-[state=closed]:opacity-0", "scale-[0.96] data-[state=open]:scale-100 transition-[opacity,transform] duration-200", className),
		...props,
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
			className: "absolute right-3 top-3 rounded-md p-1 text-dim hover:text-fog hover:bg-navy-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: "Close"
			})]
		})]
	})] });
}
function DialogTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
		className: cn("font-display text-lg font-semibold tracking-tight text-fog", className),
		...props
	});
}
function DialogDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
		className: cn("text-sm text-mist", className),
		...props
	});
}
function Input({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn("flex h-10 w-full rounded-md border border-line bg-navy-3 px-3 text-sm text-fog placeholder:text-dim", "transition-[border-color,box-shadow] duration-150", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey/50 focus-visible:border-honey/40", "disabled:opacity-40", className),
		...props
	});
}
function Label({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
		className: cn("text-xs font-medium tracking-wide text-mist", className),
		...props
	});
}
function NewProjectDialog({ open, onOpenChange }) {
	const createProject = useHiveStore((s) => s.createProject);
	const githubConnected = useHiveStore((s) => s.githubConnected);
	const githubRepos = useHiveStore((s) => s.githubRepos);
	const createRepo = useHiveStore((s) => s.createRepo);
	const githubBusy = useHiveStore((s) => s.githubBusy);
	const [name, setName] = (0, import_react.useState)("");
	const [repo, setRepo] = (0, import_react.useState)("");
	const [newRepo, setNewRepo] = (0, import_react.useState)("");
	const submit = async () => {
		let repoFullName = repo || null;
		if (newRepo.trim()) repoFullName = await createRepo(newRepo.trim());
		createProject(name || "Untitled project", repoFullName);
		setName("");
		setRepo("");
		setNewRepo("");
		onOpenChange(false);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "New project" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
				className: "mt-1",
				children: "Open a workspace. Connect a repository in Settings if you want RO to push later."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "np-name",
						children: "Name"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "np-name",
						value: name,
						onChange: (e) => setName(e.target.value),
						placeholder: "Studio landing"
					})]
				}), githubConnected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "np-repo",
						children: "Existing repository"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						id: "np-repo",
						value: repo,
						onChange: (e) => setRepo(e.target.value),
						className: "flex h-10 w-full rounded-md border border-line bg-navy-3 px-3 text-sm text-fog",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "None yet"
						}), githubRepos.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: r.fullName,
							children: r.fullName
						}, r.fullName))]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "np-new",
						children: "Or create repository"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "np-new",
						value: newRepo,
						onChange: (e) => setNewRepo(e.target.value),
						placeholder: "my-new-repo"
					})]
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 flex justify-end gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					onClick: () => onOpenChange(false),
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: submit,
					disabled: githubBusy,
					children: "Open"
				})]
			})
		] })
	});
}
function LeftSidebar({ collapsed, onCollapse, mobile }) {
	const view = useHiveStore((s) => s.view);
	const setView = useHiveStore((s) => s.setView);
	const projects = useHiveStore((s) => s.projects);
	const activeId = useHiveStore((s) => s.activeProjectId);
	const selectProject = useHiveStore((s) => s.selectProject);
	const logout = useHiveStore((s) => s.logout);
	const sessionName = useHiveStore((s) => s.sessionName);
	const [openNew, setOpenNew] = (0, import_react.useState)(false);
	const navBtn = (active) => cn("flex w-full items-center gap-3 rounded-md px-2.5 text-sm transition-colors duration-150", collapsed && !mobile ? "justify-center px-0" : "", mobile ? "h-11" : "h-9", active ? "bg-navy-4 text-fog" : "text-mist hover:bg-navy-3 hover:text-fog");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: cn("flex h-full flex-col border-r border-line bg-navy-2", mobile ? "w-full" : collapsed ? "w-14" : "w-[220px]"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("flex h-14 items-center border-b border-line px-3", collapsed && !mobile ? "justify-center" : "justify-between"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HiveWordmark, { collapsed: collapsed && !mobile }), !mobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onCollapse,
					className: "rounded-md p-1.5 text-dim hover:bg-navy-4 hover:text-fog",
					"aria-label": collapsed ? "Expand sidebar" : "Collapse sidebar",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelLeft, { className: "size-4" })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "p-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "secondary",
					className: cn("w-full", collapsed && !mobile ? "px-0" : "justify-start"),
					onClick: () => setOpenNew(true),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), (!collapsed || mobile) && "New Project"]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ScrollArea, {
				className: "flex-1 px-2",
				children: [(!collapsed || mobile) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-1 px-2 pt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-dim",
					children: "Projects"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-0.5 pb-3",
					children: projects.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: navBtn(view === "workspace" && p.id === activeId),
						onClick: () => selectProject(p.id),
						title: p.name,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Folder, { className: "size-4 shrink-0" }), (!collapsed || mobile) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: p.name
						})]
					}) }, p.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-auto border-t border-line p-2 space-y-0.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: navBtn(view === "memory"),
						onClick: () => setView("memory"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "size-4 shrink-0" }), (!collapsed || mobile) && "Memory"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: navBtn(view === "settings"),
						onClick: () => setView("settings"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "size-4 shrink-0" }), (!collapsed || mobile) && "Settings"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: navBtn(false),
						onClick: logout,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "size-4 shrink-0" }), (!collapsed || mobile) && (sessionName ? `Log out` : "Log out")]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewProjectDialog, {
				open: openNew,
				onOpenChange: setOpenNew
			})
		]
	});
}
function StatusBar({ onOpenStatus }) {
	const status = useHiveStore((s) => s.status);
	const phase = useHiveStore((s) => s.phase);
	const live = phase !== "idle" && phase !== "complete" && phase !== "cancelled" && phase !== "error";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: onOpenStatus,
		className: "group flex w-full flex-col gap-0.5 rounded-md px-1 py-1.5 text-left transition-colors duration-150 hover:bg-navy-3/70",
		"aria-label": "Open Hive status",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, {
				role: "MC",
				text: status.mc,
				live
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, {
				role: "HRC",
				text: status.hrc,
				live
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, {
				role: "RO",
				text: status.ro,
				live
			})
		]
	});
}
function StatusLine({ role, text, live }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: cn("flex items-baseline gap-2 font-mono text-[11px] leading-relaxed text-mist/80", "transition-opacity duration-300"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "w-8 shrink-0 text-honey/80",
			children: role
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("truncate", live && "shimmer bg-clip-text"),
			children: text
		})]
	}, role + text);
}
function ResultBlock({ title, ready }) {
	const setPreviewOpen = useHiveStore((s) => s.setPreviewOpen);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: () => ready && setPreviewOpen(true),
		disabled: !ready,
		className: "group w-full max-w-md rounded-xl border border-honey/30 bg-navy-3 px-5 py-6 text-left transition-[border-color,transform] duration-200 hover:border-honey/60 active:scale-[0.99] disabled:opacity-60",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[10px] uppercase tracking-[0.18em] text-honey",
				children: "Hive finished"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 font-display text-lg font-semibold tracking-tight text-fog",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-mist",
				children: ready ? "Ready to preview" : "Integrating…"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 flex items-center gap-1 text-sm text-honey",
				children: ["Click to Preview", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4 transition-transform duration-150 group-hover:translate-x-0.5" })]
			})
		]
	});
}
var STARTERS = [
	"Build me a landing page for a ceramics studio",
	"Fix the mobile layout of the last site",
	"Add a waitlist form with a dark editorial look"
];
function ChatWorkspace({ onOpenStatus }) {
	const project = useHiveStore((s) => s.activeProject());
	const send = useHiveStore((s) => s.send);
	const cancel = useHiveStore((s) => s.cancel);
	const phase = useHiveStore((s) => s.phase);
	const frozen = useHiveStore((s) => s.frozen);
	const aiAvailable = useHiveStore((s) => s.aiAvailable);
	const artifact = project?.artifact ?? null;
	const running = phase !== "idle" && phase !== "complete" && phase !== "cancelled" && phase !== "error" && phase !== "paused" && phase !== "frozen";
	const [draft, setDraft] = (0, import_react.useState)("");
	const [files, setFiles] = (0, import_react.useState)([]);
	const endRef = (0, import_react.useRef)(null);
	const taRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		endRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "end"
		});
	}, [project?.messages.length, phase]);
	const submit = async (text) => {
		const prompt = (text ?? draft).trim();
		if (!prompt && files.length === 0) return;
		if (running || frozen) return;
		setDraft("");
		const attached = files;
		setFiles([]);
		await send(prompt, attached);
	};
	const onFiles = async (e) => {
		const list = Array.from(e.target.files ?? []).slice(0, 4);
		const next = [];
		for (const file of list) {
			const isImage = file.type.startsWith("image/");
			const att = {
				id: nid("att"),
				name: file.name,
				mime: file.type || "application/octet-stream",
				size: file.size,
				kind: isImage ? "image" : "file"
			};
			if (isImage && file.size < 2e6) att.dataUrl = await readDataUrl(file);
			else if (!isImage && file.size < 8e4 && /text|json|javascript|svg|html|markdown/.test(file.type + file.name)) att.textExcerpt = (await file.text()).slice(0, 8e3);
			next.push(att);
		}
		setFiles((prev) => [...prev, ...next].slice(0, 6));
		e.target.value = "";
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full min-w-0 flex-col bg-navy",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "flex h-14 shrink-0 items-center justify-between border-b border-line px-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate font-display text-sm font-semibold tracking-tight text-fog",
						children: project?.name ?? "Hive"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[11px] text-dim",
						children: ["Talking to MC", project?.repoFullName ? ` · ${project.repoFullName}` : ""]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollArea, {
				className: "flex-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex min-h-full max-w-2xl flex-col px-4 py-6",
					children: [
						(!project || project.messages.length === 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
							disabled: running || frozen,
							onPick: (s) => {
								setDraft(s);
								submit(s);
							}
						}),
						project?.messages.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageBubble, {
							message: m,
							artifactTitle: m.hasArtifact ? artifact?.title : void 0,
							artifactReady: Boolean(m.hasArtifact && artifact?.ready && phase === "complete")
						}, m.id)),
						running && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rise-in mt-4 text-sm text-mist",
							children: "Hive is working. You can watch the swarm on the right."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: endRef })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "shrink-0 border-t border-line bg-navy-2/80 px-3 py-2 backdrop-blur-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-2xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, { onOpenStatus }),
						aiAvailable === false && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-2 px-1 text-xs text-danger",
							children: "AI is not available in this environment. Hive cannot run a swarm until it is."
						}),
						frozen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-2 px-1 text-xs text-honey",
							children: "Emergency freeze is on. Open a new project to resume."
						}),
						files.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mb-2 flex flex-wrap gap-2",
							children: files.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "relative flex items-center gap-2 rounded-md border border-line bg-navy-3 p-1.5 pr-7",
								children: [
									f.kind === "image" && f.dataUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: f.dataUrl,
										alt: "",
										className: "size-10 rounded-sm object-cover"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "px-2 font-mono text-[10px] text-mist",
										children: "FILE"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "max-w-32 truncate text-xs text-fog",
										children: f.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-dim",
										children: formatBytes(f.size)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "absolute right-1 top-1 rounded-sm p-0.5 text-dim hover:text-fog",
										onClick: () => setFiles((prev) => prev.filter((x) => x.id !== f.id)),
										"aria-label": `Remove ${f.name}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-3" })
									})
								]
							}, f.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "flex items-end gap-2 rounded-lg border border-line bg-navy-3 p-2",
							onSubmit: (e) => {
								e.preventDefault();
								submit();
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-mist hover:bg-navy-4 hover:text-fog",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Paperclip, { className: "size-4" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "sr-only",
											children: "Attach files"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "file",
											className: "sr-only",
											multiple: true,
											accept: "image/*,.txt,.md,.json,.html,.css,.js,.ts,.tsx",
											onChange: (e) => void onFiles(e),
											disabled: running || frozen
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									ref: taRef,
									rows: 1,
									value: draft,
									onChange: (e) => {
										setDraft(e.target.value);
										e.target.style.height = "auto";
										e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
									},
									onKeyDown: (e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											submit();
										}
									},
									placeholder: "Tell MC what to build or change",
									disabled: running || frozen || aiAvailable === false,
									className: "max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm text-fog placeholder:text-dim focus:outline-none"
								}),
								running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "danger",
									size: "icon",
									onClick: cancel,
									"aria-label": "Cancel",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-3.5 fill-current" })
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "submit",
									size: "icon",
									disabled: frozen || aiAvailable === false || !draft.trim() && files.length === 0,
									"aria-label": "Send",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-4" })
								})
							]
						})
					]
				})
			})
		]
	});
}
function EmptyState({ onPick, disabled }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-1 flex-col items-center justify-center py-16 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-3xl font-semibold tracking-[0.18em] text-fog",
				children: "HIVE"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-sm text-sm leading-relaxed text-mist",
				children: "Tell MC what you want. Attach a file or image if it helps. The swarm stays behind the scenes unless you open status."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-8 flex w-full max-w-md flex-col gap-2",
				children: STARTERS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled,
					onClick: () => onPick(s),
					className: "w-full rounded-lg border border-line bg-navy-2 px-4 py-3 text-left text-sm text-mist transition-colors duration-150 hover:border-honey/35 hover:text-fog",
					children: s
				}) }, s))
			})
		]
	});
}
function MessageBubble({ message, artifactTitle, artifactReady }) {
	const isUser = message.role === "user";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: cn("mb-5 rise-in", isUser ? "ml-8 sm:ml-16" : "mr-4"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-dim",
				children: isUser ? "You" : "MC"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("rounded-lg px-3.5 py-3 text-sm leading-relaxed", isUser ? "border border-line bg-navy-3 text-fog" : "bg-transparent px-0 text-fog"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "whitespace-pre-wrap",
					children: message.content
				}), message.attachments && message.attachments.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 flex flex-wrap gap-2",
					children: message.attachments.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: "overflow-hidden rounded-md border border-line",
						children: f.kind === "image" && f.dataUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: f.dataUrl,
							alt: f.name,
							className: "h-24 w-24 object-cover"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block px-2 py-1.5 text-xs text-mist",
							children: f.name
						})
					}, f.id))
				})]
			}),
			message.hasArtifact && artifactTitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultBlock, {
					title: artifactTitle,
					ready: Boolean(artifactReady)
				})
			})
		]
	});
}
function readDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}
function Badge({ className, tone = "mist", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide", {
			mist: "bg-navy-4 text-mist border-line",
			honey: "bg-honey/12 text-honey border-honey/25",
			ok: "bg-ok/12 text-ok border-ok/25",
			danger: "bg-danger/12 text-danger border-danger/25"
		}[tone], className),
		...props
	});
}
function Separator({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("h-px w-full bg-line", className),
		...props
	});
}
function StatusPanel({ onClose, mobile }) {
	const status = useHiveStore((s) => s.status);
	const lieutenants = useHiveStore((s) => s.lieutenants);
	const agentTotal = useHiveStore((s) => s.agentTotal);
	const phase = useHiveStore((s) => s.phase);
	const fileLocks = useHiveStore((s) => s.fileLocks);
	const pauseReason = useHiveStore((s) => s.pauseReason);
	const freeze = useHiveStore((s) => s.freeze);
	const frozen = useHiveStore((s) => s.frozen);
	const audits = useHiveStore((s) => s.audits);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "flex h-full w-full flex-col border-l border-line bg-navy-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex h-14 items-center justify-between border-b border-line px-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-sm font-semibold tracking-[0.2em] text-fog",
					children: "HIVE"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[10px] uppercase tracking-[0.16em] text-dim",
					children: "Status"
				})] }), mobile && onClose && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "rounded-md p-1.5 text-dim hover:bg-navy-4 hover:text-fog",
					onClick: onClose,
					"aria-label": "Close status",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollArea, {
				className: "flex-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-5 p-4",
					children: [
						pauseReason && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs leading-relaxed text-danger",
							children: pauseReason
						}),
						frozen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-lg border border-honey/30 bg-honey/10 p-3 text-xs text-honey",
							children: "Emergency freeze is on. Start a new project to continue."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExecBlock, {
							name: "MC",
							activity: status.mc
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExecBlock, {
							name: "HRC",
							activity: status.hrc
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExecBlock, {
							name: "RO",
							activity: status.ro
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-dim",
							children: "Active Li"
						}), lieutenants.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-dim",
							children: "No Li summoned"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "space-y-2",
							children: lieutenants.map((li) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "rounded-md border border-line bg-navy-3 px-3 py-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono text-xs text-honey",
											children: ["Li ", li.letter]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											tone: li.status === "done" ? "ok" : "mist",
											children: li.status
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-xs text-mist",
										children: li.activity
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-0.5 text-[11px] text-dim",
										children: li.objective
									})
								]
							}, li.letter))
						})] }),
						fileLocks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-dim",
							children: "File locks"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "space-y-1",
							children: fileLocks.slice(0, 8).map((lock) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "font-mono text-[11px] text-mist",
								children: [lock.path, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-2 text-dim",
									children: lock.ownerLabel
								})]
							}, lock.path))
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-dim",
							children: "Recent activity"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "space-y-2",
							children: [audits.slice(0, 10).map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "text-[11px] leading-snug text-mist",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-honey/80",
										children: a.actor
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-dim",
										children: " · "
									}),
									a.action
								]
							}, a.id)), audits.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "text-xs text-dim",
								children: "Quiet."
							})]
						})] })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-t border-line p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-end justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-mono text-2xl tabular-nums leading-none text-fog",
						children: [agentTotal, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-sm text-dim",
							children: [" / ", 650]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[10px] uppercase tracking-[0.16em] text-dim",
						children: "Agents active"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: freeze,
						disabled: frozen || phase === "idle",
						title: "Emergency freeze",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Snowflake, { className: "size-3.5" }), "Freeze"]
					})]
				})
			})
		]
	});
}
function ExecBlock({ name, activity }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "font-display text-xs font-semibold tracking-[0.18em] text-honey",
		children: name
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: cn("mt-1 text-sm text-fog transition-opacity duration-300", activity !== "Standing by" && "opacity-100"),
		children: activity
	})] });
}
function SettingsView() {
	const sessionName = useHiveStore((s) => s.sessionName);
	const logout = useHiveStore((s) => s.logout);
	const githubConnected = useHiveStore((s) => s.githubConnected);
	const githubUsername = useHiveStore((s) => s.githubUsername);
	const githubRepo = useHiveStore((s) => s.githubRepo);
	const githubRepos = useHiveStore((s) => s.githubRepos);
	const githubBusy = useHiveStore((s) => s.githubBusy);
	const githubError = useHiveStore((s) => s.githubError);
	const connect = useHiveStore((s) => s.connectGithub);
	const disconnect = useHiveStore((s) => s.disconnectGithub);
	const setGithubRepo = useHiveStore((s) => s.setGithubRepo);
	const refreshRepos = useHiveStore((s) => s.refreshRepos);
	const createRepo = useHiveStore((s) => s.createRepo);
	const [username, setUsername] = (0, import_react.useState)(githubUsername);
	const [pat, setPat] = (0, import_react.useState)("");
	const [newRepo, setNewRepo] = (0, import_react.useState)("");
	const saveGithub = async () => {
		const ok = await connect(username, pat);
		setPat("");
		if (ok) toast.success("GitHub connected");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-navy",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "flex h-14 items-center border-b border-line px-5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-sm font-semibold tracking-tight",
				children: "Settings"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-xl flex-1 space-y-8 overflow-auto px-5 py-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-base font-semibold",
						children: "Account"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-mist",
						children: "This workspace is local to this browser."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 rounded-lg border border-line bg-navy-2 p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-dim",
								children: "Signed in as"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-fog",
								children: sessionName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "secondary",
								className: "mt-4",
								onClick: logout,
								children: "Log out"
							})
						]
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-base font-semibold",
						children: "GitHub"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-mist",
						children: "RO is the only Hive worker that can use this token. It is stored on the server, never shown again, and never placed in prompts, chat, or memory."
					}),
					githubConnected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 space-y-4 rounded-lg border border-line bg-navy-2 p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-fog",
								children: ["Connected as ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-honey",
									children: githubUsername
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "repo",
									children: "Active repository"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									id: "repo",
									value: githubRepo ?? "",
									onChange: (e) => setGithubRepo(e.target.value || null),
									onFocus: () => void refreshRepos(),
									className: "flex h-10 w-full rounded-md border border-line bg-navy-3 px-3 text-sm text-fog",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "",
										children: "Choose a repository"
									}), githubRepos.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: r.fullName,
										children: r.fullName
									}, r.fullName))]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									placeholder: "new-repo-name",
									value: newRepo,
									onChange: (e) => setNewRepo(e.target.value)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "secondary",
									disabled: !newRepo.trim() || githubBusy,
									onClick: async () => {
										const full = await createRepo(newRepo.trim());
										if (full) {
											toast.success(`Created ${full}`);
											setNewRepo("");
										}
									},
									children: "Create"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								onClick: () => void disconnect(),
								children: "Disconnect GitHub"
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "mt-4 space-y-3 rounded-lg border border-line bg-navy-2 p-4",
						onSubmit: (e) => {
							e.preventDefault();
							saveGithub();
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "gh-user",
									children: "GitHub username"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "gh-user",
									value: username,
									onChange: (e) => setUsername(e.target.value),
									autoComplete: "username"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "gh-pat",
									children: "Personal access token"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "gh-pat",
									type: "password",
									autoComplete: "off",
									value: pat,
									onChange: (e) => setPat(e.target.value),
									placeholder: "ghp_… or github_pat_…"
								})]
							}),
							githubError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-danger",
								children: githubError
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								disabled: githubBusy || !pat.trim(),
								children: githubBusy ? "Validating…" : "Connect"
							})
						]
					})
				] })
			]
		})]
	});
}
function Textarea({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("flex min-h-16 w-full rounded-md border border-line bg-navy-3 px-3 py-2 text-sm text-fog placeholder:text-dim", "transition-[border-color,box-shadow] duration-150", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey/50 focus-visible:border-honey/40", "disabled:opacity-40 resize-none", className),
		...props
	});
}
function MemoryView() {
	const memories = useHiveStore((s) => s.memories);
	const updateMemory = useHiveStore((s) => s.updateMemory);
	const deleteMemory = useHiveStore((s) => s.deleteMemory);
	const addMemory = useHiveStore((s) => s.addMemory);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col bg-navy",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex h-14 items-center justify-between border-b border-line px-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-sm font-semibold tracking-tight",
				children: "Hive memory"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] text-dim",
				children: "Editable knowledge RO keeps for later runs"
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				variant: "secondary",
				onClick: () => addMemory({
					title: "New note",
					content: "",
					source: "project"
				}),
				children: "Add"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-2xl flex-1 space-y-4 overflow-auto px-5 py-6",
			children: [memories.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-mist",
				children: "Empty. RO stores useful research and completed-work notes here after a run. Nothing secret belongs in memory."
			}), memories.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "rounded-lg border border-line bg-navy-2 p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-[10px] uppercase tracking-[0.14em] text-dim",
							children: [
								m.source,
								" · ",
								relativeTime(m.createdAt)
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "rounded-md p-1.5 text-dim hover:bg-navy-4 hover:text-danger",
							onClick: () => deleteMemory(m.id),
							"aria-label": "Delete memory",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5" })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: m.title,
						onChange: (e) => updateMemory(m.id, { title: e.target.value }),
						className: "border-transparent bg-transparent px-0 font-medium"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
						value: m.content,
						onChange: (e) => updateMemory(m.id, { content: e.target.value }),
						className: "mt-2 min-h-20 border-transparent bg-transparent px-0"
					})
				]
			}, m.id))]
		})]
	});
}
function PreviewDialog() {
	const open = useHiveStore((s) => s.previewOpen);
	const setOpen = useHiveStore((s) => s.setPreviewOpen);
	const project = useHiveStore((s) => s.activeProject());
	const phase = useHiveStore((s) => s.phase);
	const previewRunning = useHiveStore((s) => s.previewRunning);
	const runPreview = useHiveStore((s) => s.runPreview);
	const githubConnected = useHiveStore((s) => s.githubConnected);
	const githubRepo = useHiveStore((s) => s.githubRepo);
	const pushApprovedWork = useHiveStore((s) => s.pushApprovedWork);
	const pushBusy = useHiveStore((s) => s.pushBusy);
	const [tab, setTab] = (0, import_react.useState)("view");
	const [frameKey, setFrameKey] = (0, import_react.useState)(0);
	const artifact = project?.artifact;
	const ready = Boolean(artifact?.ready && phase === "complete");
	const repo = project?.repoFullName || githubRepo;
	const code = (0, import_react.useMemo)(() => {
		if (!artifact) return "";
		if (artifact.files.length === 1) return artifact.files[0].content;
		return artifact.files.map((f) => `/* ${f.path} */\n${f.content}`).join("\n\n");
	}, [artifact]);
	const download = () => {
		if (!artifact) return;
		const blob = new Blob([artifact.html || code], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${slug(artifact.title)}.html`;
		a.click();
		URL.revokeObjectURL(url);
	};
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(artifact?.html || code);
			toast.success("Copied to clipboard");
		} catch {
			toast.error("Could not copy");
		}
	};
	const push = async () => {
		const res = await pushApprovedWork();
		if (res.ok) toast.success(`RO pushed to ${repo}`);
		else toast.error(res.error || "Push failed");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "flex h-[min(90dvh,820px)] max-w-5xl flex-col p-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 pr-12",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "text-base",
					children: artifact?.title ?? "Preview"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
					className: "text-xs",
					children: ready ? "Finished work" : "Hive is still building"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: tab === "view" ? "secondary" : "ghost",
							onClick: () => setTab("view"),
							children: "View"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: tab === "code" ? "secondary" : "ghost",
							onClick: () => setTab("code"),
							children: "Code"
						}),
						ready && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							onClick: () => {
								runPreview();
								setFrameKey((k) => k + 1);
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-3.5" }), "Run"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							variant: "secondary",
							onClick: download,
							disabled: !artifact,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-3.5" }), "Download"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							variant: "secondary",
							onClick: () => void copy(),
							disabled: !artifact,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-3.5" }), "Copy"]
						}),
						githubConnected && repo && ready && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							variant: "outline",
							onClick: () => void push(),
							disabled: pushBusy,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "size-3.5" }), "Push"]
						})
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-0 flex-1 bg-navy",
				children: tab === "code" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "h-full overflow-auto p-4 font-mono text-xs leading-relaxed text-mist",
					children: code || "No code yet."
				}) : !artifact ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex h-full items-center justify-center text-sm text-dim",
					children: "Nothing to preview yet."
				}) : !ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex h-full items-center justify-center text-sm text-mist",
					children: "Preview will appear when Hive finishes."
				}) : previewRunning ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
					title: "Hive preview",
					sandbox: "allow-scripts allow-forms allow-modals",
					srcDoc: artifact.html,
					className: "h-full w-full bg-fog"
				}, frameKey) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex h-full flex-col items-center justify-center gap-3 px-6 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-xl text-fog",
							children: "Website ready"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "max-w-sm text-sm text-mist",
							children: "Run launches the live preview. Download or copy the code anytime."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: runPreview,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" }), "Run"]
						})
					]
				})
			})]
		})
	});
}
function slug(s) {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "hive-result";
}
function Welcome() {
	const enter = useHiveStore((s) => s.enterWorkspace);
	const [name, setName] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex min-h-dvh items-center justify-center overflow-hidden bg-navy px-5 hex-grid",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			"aria-hidden": true,
			className: "pointer-events-none absolute inset-0",
			style: { background: "radial-gradient(ellipse at 50% 30%, color-mix(in oklab, var(--color-honey) 8%, transparent), transparent 55%)" }
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "relative w-full max-w-sm rise-in",
			onSubmit: (e) => {
				e.preventDefault();
				enter(name);
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-8 flex flex-col items-center text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-5 text-honey",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HiveMark, { className: "size-12" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display text-4xl font-semibold tracking-[0.22em] text-fog",
							children: "HIVE"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 max-w-[16rem] text-sm leading-relaxed text-mist",
							children: "Tell MC what you want built. The swarm handles the rest."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "sr-only",
					htmlFor: "hive-name",
					children: "Your name"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "hive-name",
					autoFocus: true,
					autoComplete: "nickname",
					placeholder: "Your name",
					value: name,
					onChange: (e) => setName(e.target.value),
					className: "h-11 bg-navy-2"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					className: "mt-3 h-11 w-full",
					disabled: !name.trim(),
					children: "Enter workspace"
				})
			]
		})]
	});
}
function AppShell() {
	const hydrated = useHiveStore((s) => s.hydrated);
	const sessionName = useHiveStore((s) => s.sessionName);
	const view = useHiveStore((s) => s.view);
	const leftCollapsed = useHiveStore((s) => s.leftCollapsed);
	const rightCollapsed = useHiveStore((s) => s.rightCollapsed);
	const toggleLeft = useHiveStore((s) => s.toggleLeft);
	const toggleRight = useHiveStore((s) => s.toggleRight);
	const leftOpenMobile = useHiveStore((s) => s.leftOpenMobile);
	const rightOpenMobile = useHiveStore((s) => s.rightOpenMobile);
	const setLeftOpenMobile = useHiveStore((s) => s.setLeftOpenMobile);
	const setRightOpenMobile = useHiveStore((s) => s.setRightOpenMobile);
	const checkAi = useHiveStore((s) => s.checkAi);
	const [narrow, setNarrow] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const mark = () => {
			if (!useHiveStore.getState().hydrated) useHiveStore.setState({ hydrated: true });
		};
		const unsub = useHiveStore.persist.onFinishHydration(mark);
		if (useHiveStore.persist.hasHydrated()) mark();
		const t = window.setTimeout(mark, 400);
		return () => {
			unsub();
			window.clearTimeout(t);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		checkAi();
	}, [checkAi]);
	(0, import_react.useEffect)(() => {
		const mq = window.matchMedia("(max-width: 900px)");
		const apply = () => setNarrow(mq.matches);
		apply();
		mq.addEventListener("change", apply);
		return () => mq.removeEventListener("change", apply);
	}, []);
	if (!hydrated) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-dvh items-center justify-center bg-navy text-honey",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HiveMark, { className: "size-10" })
	});
	if (!sessionName) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Welcome, {});
	const openRight = () => {
		if (narrow) setRightOpenMobile(true);
		else if (rightCollapsed) toggleRight();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh overflow-hidden bg-navy text-fog",
		children: [
			!narrow && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LeftSidebar, {
				collapsed: leftCollapsed,
				onCollapse: toggleLeft
			}),
			narrow && leftOpenMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "fixed inset-0 z-40 flex",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "w-[min(100%,280px)] bg-navy-2 shadow-panel",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LeftSidebar, {
						collapsed: false,
						onCollapse: () => setLeftOpenMobile(false),
						mobile: true
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "flex-1 bg-navy/60",
					"aria-label": "Close menu",
					onClick: () => setLeftOpenMobile(false)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "flex min-w-0 flex-1 flex-col",
				children: [narrow && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex h-12 items-center justify-between border-b border-line px-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex size-11 items-center justify-center rounded-md text-mist hover:bg-navy-3 hover:text-fog",
							onClick: () => setLeftOpenMobile(true),
							"aria-label": "Open menu",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-display text-xs tracking-[0.18em]",
							children: "HIVE"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "flex size-11 items-center justify-center rounded-md text-mist hover:bg-navy-3 hover:text-fog",
							onClick: () => setRightOpenMobile(true),
							"aria-label": "Open Hive status",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "size-5" })
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-h-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "min-w-0 flex-1",
						children: view === "settings" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsView, {}) : view === "memory" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MemoryView, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatWorkspace, { onOpenStatus: openRight })
					}), !narrow && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("shrink-0 transition-[width] duration-200 ease-out", rightCollapsed ? "w-0 overflow-hidden" : "w-[280px]"),
						children: !rightCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative h-full",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "absolute left-0 top-3 z-10 -translate-x-1/2 rounded-full border border-line bg-navy-3 p-1 text-dim hover:text-fog",
								onClick: toggleRight,
								"aria-label": "Collapse Hive status",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "size-3.5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPanel, {})]
						})
					})]
				})]
			}),
			narrow && rightOpenMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "fixed inset-0 z-40 flex",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "flex-1 bg-navy/60",
					"aria-label": "Close status",
					onClick: () => setRightOpenMobile(false)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-full w-[min(100%,320px)] shadow-panel",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPanel, {
						mobile: true,
						onClose: () => setRightOpenMobile(false)
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewDialog, {})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {});
}
//#endregion
export { Home as component };
