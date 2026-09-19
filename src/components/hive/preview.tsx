import { Copy, Download, Play, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useHiveStore } from "@/lib/hive/store";
import { toast } from "sonner";

export function PreviewDialog() {
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
  const [tab, setTab] = useState<"view" | "code">("view");
  const [frameKey, setFrameKey] = useState(0);

  const artifact = project?.artifact;
  const ready = Boolean(artifact?.ready && phase === "complete");
  const repo = project?.repoFullName || githubRepo;

  const code = useMemo(() => {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex h-[min(90dvh,820px)] max-w-5xl flex-col p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 pr-12">
          <div>
            <DialogTitle className="text-base">{artifact?.title ?? "Preview"}</DialogTitle>
            <DialogDescription className="text-xs">
              {ready ? "Finished work" : "Hive is still building"}
            </DialogDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant={tab === "view" ? "secondary" : "ghost"}
              onClick={() => setTab("view")}
            >
              View
            </Button>
            <Button
              size="sm"
              variant={tab === "code" ? "secondary" : "ghost"}
              onClick={() => setTab("code")}
            >
              Code
            </Button>
            {ready && (
              <Button
                size="sm"
                onClick={() => {
                  runPreview();
                  setFrameKey((k) => k + 1);
                }}
              >
                <Play className="size-3.5" />
                Run
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={download} disabled={!artifact}>
              <Download className="size-3.5" />
              Download
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void copy()} disabled={!artifact}>
              <Copy className="size-3.5" />
              Copy
            </Button>
            {githubConnected && repo && ready && (
              <Button size="sm" variant="outline" onClick={() => void push()} disabled={pushBusy}>
                <Upload className="size-3.5" />
                Push
              </Button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-navy">
          {tab === "code" ? (
            <pre className="h-full overflow-auto p-4 font-mono text-xs leading-relaxed text-mist">
              {code || "No code yet."}
            </pre>
          ) : !artifact ? (
            <div className="flex h-full items-center justify-center text-sm text-dim">
              Nothing to preview yet.
            </div>
          ) : !ready ? (
            <div className="flex h-full items-center justify-center text-sm text-mist">
              Preview will appear when Hive finishes.
            </div>
          ) : previewRunning ? (
            <iframe
              key={frameKey}
              title="Hive preview"
              sandbox="allow-scripts allow-forms allow-modals"
              srcDoc={artifact.html}
              className="h-full w-full bg-fog"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="font-display text-xl text-fog">Website ready</p>
              <p className="max-w-sm text-sm text-mist">
                Run launches the live preview. Download or copy the code anytime.
              </p>
              <Button onClick={runPreview}>
                <Play className="size-4" />
                Run
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "hive-result";
}
