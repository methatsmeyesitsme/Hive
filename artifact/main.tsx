import { createRoot } from "react-dom/client";
import { Toaster, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/hive/app-shell";
import "../src/styles.css";
import {
  markBreadcrumbClean,
  subscribeModelStatus,
  takeLastBreadcrumb,
  warmModelIfCached,
} from "@/lib/hive/local-model";
import "./artifact.css";

type Downloads = { save: (req: { filename: string; data: Blob }) => Promise<unknown> };
type ClaudeGlobal = { use?: (name: string) => Promise<unknown> };

/**
 * Inside a claude.ai artifact a page cannot start downloads itself, so route
 * Hive's "Download" (a blob: link click) through the `downloads` capability.
 * On a normal website the ordinary browser download is used.
 */
const blobs = new Map<string, Blob>();
if (typeof URL.createObjectURL === "function") {
  const nativeCreateObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (obj: Blob | MediaSource) => {
    const url = nativeCreateObjectURL(obj);
    if (obj instanceof Blob) blobs.set(url, obj);
    return url;
  };
}

async function saveFile(filename: string, blob: Blob) {
  const claude = (window as unknown as { claude?: ClaudeGlobal }).claude;
  let downloads: Downloads | null = null;
  try {
    downloads = ((await claude?.use?.("downloads")) as Downloads | null) ?? null;
  } catch {
    downloads = null;
  }
  if (!downloads) {
    toast.error("Downloads aren't available here. Use Copy instead.");
    return;
  }
  try {
    await downloads.save({ filename, data: blob });
  } catch (err) {
    if ((err as { code?: string })?.code !== "declined") toast.error("Could not save the file.");
  }
}

const nativeAnchorClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
  const blob = this.download ? blobs.get(this.href) : undefined;
  const inClaude = typeof (window as unknown as { claude?: ClaudeGlobal }).claude?.use === "function";
  if (blob && inClaude) {
    void saveFile(this.download, blob);
    return;
  }
  nativeAnchorClick.call(this);
};

/** Clipboard API can be blocked inside the frame; fall back to execCommand. */
const nativeWriteText = navigator.clipboard?.writeText?.bind(navigator.clipboard);
async function writeText(text: string) {
  try {
    if (nativeWriteText) {
      await nativeWriteText(text);
      return;
    }
  } catch {
    // fall through to the legacy path
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  if (!ok) throw new Error("copy failed");
}
try {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
} catch {
  // leave the native clipboard in place
}

/** If the last session died mid-run, say where (best-effort diagnostics). */
window.addEventListener("pagehide", markBreadcrumbClean);
const lastRun = takeLastBreadcrumb();
if (lastRun && !lastRun.clean) {
  const hint = lastRun.device?.includes("webgpu")
    ? "If it keeps happening, add ?device=wasm to the web address (slower, avoids the GPU)."
    : "If it keeps happening on this phone, it may be running out of memory. Adding ?model=360m to the web address uses a smaller model.";
  setTimeout(() => {
    toast.warning(`Hive reloaded while ${lastRun.stage}${lastRun.device ? ` (${lastRun.device})` : ""}. ${hint}`, {
      duration: 20000,
    });
  }, 800);
}

// An earlier build remembered a smaller model after a crash. Qwen is the default again.
try {
  localStorage.removeItem("hive-model-rung");
} catch {
  // storage unavailable
}

/** Show model download progress so a long first load doesn't look stuck. */
let lastPct = -1;
subscribeModelStatus((status) => {
  if (status.stage === "loading") {
    const pct = Math.round(status.progress * 100);
    if (pct !== lastPct) {
      lastPct = pct;
      toast.loading(`Loading ${status.model ?? "the model"}… ${pct}%`, { id: "model-load" });
    }
  } else if (status.stage === "ready") {
    toast.success(`${status.model ?? "The model"} is ready`, { id: "model-load", duration: 2500 });
  } else if (status.stage === "error") {
    toast.dismiss("model-load");
  }
});

createRoot(document.getElementById("root")!).render(
  <TooltipProvider delayDuration={250}>
    <AppShell />
    <Toaster
      theme="dark"
      position="bottom-right"
      toastOptions={{ classNames: { toast: "bg-navy-3 border-line text-fog" } }}
    />
  </TooltipProvider>,
);

// If the model is already in this browser's cache, start it now so its start-up
// overlaps with the first message being typed. Skipped after a crash so a phone
// that cannot run the model does not reload on every visit.
if (!lastRun || lastRun.clean) {
  window.setTimeout(() => {
    void warmModelIfCached();
  }, 1500);
}
