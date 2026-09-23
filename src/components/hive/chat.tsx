import { ChevronUp, Paperclip, Send, Square, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Attachment, ChatMessage } from "@/lib/hive/types";
import { useHiveStore } from "@/lib/hive/store";
import { cn, formatBytes, nid } from "@/lib/utils";
import { StatusBar } from "./status-bar";
import { ResultBlock } from "./result-block";

const STARTERS = [
  "Build me a landing page for a ceramics studio",
  "Fix the mobile layout of the last site",
  "Add a waitlist form with a dark editorial look",
];

export function ChatWorkspace({ onOpenStatus }: { onOpenStatus: () => void }) {
  const project = useHiveStore((s) => s.activeProject());
  const send = useHiveStore((s) => s.send);
  const cancel = useHiveStore((s) => s.cancel);
  const executionMode = useHiveStore((s) => s.executionMode);
  const setExecutionMode = useHiveStore((s) => s.setExecutionMode);
  const phase = useHiveStore((s) => s.phase);
  const frozen = useHiveStore((s) => s.frozen);
  const deleteProject = useHiveStore((s) => s.deleteProject);
  const aiAvailable = useHiveStore((s) => s.aiAvailable);
  const artifact = project?.artifact ?? null;

  const running =
    phase !== "idle" &&
    phase !== "complete" &&
    phase !== "cancelled" &&
    phase !== "error" &&
    phase !== "paused" &&
    phase !== "frozen";

  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [effort, setEffort] = useState(50);
  const [effortOpen, setEffortOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [project?.messages.length, phase]);

  const submit = async (text?: string) => {
    const prompt = (text ?? draft).trim();
    if (!prompt && files.length === 0) return;
    if (running || frozen) return;
    setDraft("");
    const attached = files;
    setFiles([]);
    await send(prompt, attached, effort);
  };

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []).slice(0, 4);
    const next: Attachment[] = [];
    for (const file of list) {
      const isImage = file.type.startsWith("image/");
      const att: Attachment = {
        id: nid("att"),
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        kind: isImage ? "image" : "file",
      };
      if (isImage && file.size < 2_000_000) {
        att.dataUrl = await readDataUrl(file);
      } else if (!isImage && file.size < 80_000 && /text|json|javascript|svg|html|markdown/.test(file.type + file.name)) {
        att.textExcerpt = (await file.text()).slice(0, 8000);
      }
      next.push(att);
    }
    setFiles((prev) => [...prev, ...next].slice(0, 6));
    e.target.value = "";
  };

  return (
    <div className="flex h-full min-w-0 flex-col bg-navy">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold tracking-tight text-fog">
            {project?.name ?? "Hive"}
          </p>
          <p className="text-[11px] text-dim">
            Talking to MC
            {project?.repoFullName ? ` · ${project.repoFullName}` : ""}
          </p>
        </div>
        {project && (
          <button
            type="button"
            className="sm:hidden rounded-md p-2 text-dim hover:bg-navy-4 hover:text-danger"
            onClick={() => {
              if (window.confirm(`Delete “${project.name}”?`) && window.confirm(`Confirm permanent deletion of “${project.name}”?`)) {
                deleteProject(project.id);
              }
            }}
            aria-label="Delete project"
            title="Delete project"
          >
            🗑
          </button>
        )}
      </header>

      <ScrollArea className="flex-1">
        <div className="mx-auto flex min-h-full max-w-2xl flex-col px-4 py-6">
          {(!project || project.messages.length === 0) && (
            <EmptyState
              disabled={running || frozen}
              onPick={(s) => {
                setDraft(s);
                void submit(s);
              }}
            />
          )}

          {project?.messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              artifactTitle={m.hasArtifact ? artifact?.title : undefined}
              artifactReady={Boolean(m.hasArtifact && artifact?.ready && phase === "complete")}
            />
          ))}

          {running && (
            <p className="rise-in mt-4 text-sm text-mist">Hive is working. You can watch the swarm on the right.</p>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-line bg-navy-2/80 px-3 py-2 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl">
          <StatusBar onOpenStatus={onOpenStatus} />

          {aiAvailable === false && (
            <p className="mb-2 px-1 text-xs text-danger">
              AI is not available in this environment. Hive cannot run a swarm until it is.
            </p>
          )}
          {frozen && (
            <p className="mb-2 px-1 text-xs text-honey">Emergency freeze is on. Open a new project to resume.</p>
          )}

          {files.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="relative flex items-center gap-2 rounded-md border border-line bg-navy-3 p-1.5 pr-7"
                >
                  {f.kind === "image" && f.dataUrl ? (
                    <img
                      src={f.dataUrl}
                      alt=""
                      className="size-10 rounded-sm object-cover"
                    />
                  ) : (
                    <span className="px-2 font-mono text-[10px] text-mist">FILE</span>
                  )}
                  <span className="max-w-32 truncate text-xs text-fog">{f.name}</span>
                  <span className="text-[10px] text-dim">{formatBytes(f.size)}</span>
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-sm p-0.5 text-dim hover:text-fog"
                    onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                    aria-label={`Remove ${f.name}`}
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form
            className="flex items-end gap-2 rounded-lg border border-line bg-navy-3 p-2"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-mist hover:bg-navy-4 hover:text-fog">
              <Paperclip className="size-4" />
              <span className="sr-only">Attach files</span>
              <input
                type="file"
                className="sr-only"
                multiple
                accept="image/*,.txt,.md,.json,.html,.css,.js,.ts,.tsx"
                onChange={(e) => void onFiles(e)}
                disabled={running || frozen}
              />
            </label>
            <textarea
              ref={taRef}
              rows={1}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder="Tell MC what to build or change"
              disabled={running || frozen || aiAvailable === false}
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm text-fog placeholder:text-dim focus:outline-none"
            />
            {running ? (
              <Button type="button" variant="danger" size="icon" onClick={() => cancel()} aria-label="Cancel">
                <Square className="size-3.5 fill-current" />
              </Button>
            ) : (
              <div className="relative shrink-0">
                {effortOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border border-line bg-navy-2 p-3 shadow-xl">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-fog">Effort</span>
                      <span className="text-[10px] font-mono text-dim">{effort < 34 ? "Low" : effort > 66 ? "High" : "Medium"}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={effort}
                      onChange={(e) => setEffort(Number(e.target.value))}
                      disabled={frozen || aiAvailable === false}
                      aria-label="Effort"
                      className="mt-3 w-full accent-[hsl(var(--honey))]"
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-dim">
                      <span>Lowest</span>
                      <span>Highest</span>
                    </div>

                    <div className="mt-4 border-t border-line pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-fog">Run mode</p>
                          <p className="mt-0.5 text-[10px] text-dim">
                            {executionMode === "swarm" ? "MC + the Hive swarm" : "Only MC runs the request"}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={executionMode === "swarm"}
                          aria-label="Run mode"
                          title={executionMode === "swarm" ? "Switch to MC Only" : "Switch to All Agents"}
                          onClick={() => setExecutionMode(executionMode === "swarm" ? "mc" : "swarm")}
                          disabled={frozen || aiAvailable === false}
                          className={cn(
                            "flex h-7 min-w-[104px] items-center justify-between rounded-full border px-1.5 text-[10px] font-medium transition-colors",
                            executionMode === "swarm"
                              ? "border-honey/40 bg-honey/10 text-honey"
                              : "border-line bg-navy-3 text-mist",
                          )}
                        >
                          <span>{executionMode === "swarm" ? "All Agents" : "MC Only"}</span>
                          <span
                            className={cn(
                              "absolute top-1 flex size-5 items-center justify-center rounded-full bg-fog transition-[left,right] duration-200",
                              executionMode === "swarm" ? "right-1" : "left-1",
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEffortOpen((open) => !open)}
                  disabled={frozen || aiAvailable === false}
                  aria-expanded={effortOpen}
                  aria-label="Effort"
                  title="Adjust effort"
                  className="h-10 gap-1.5 px-2.5 text-xs"
                >
                  Effort
                  <ChevronUp className={cn("size-3.5 transition-transform", effortOpen && "rotate-180")} />
                </Button>
              </div>
            )}
            {!running && (
              <Button
                type="submit"
                size="icon"
                disabled={frozen || aiAvailable === false || (!draft.trim() && files.length === 0)}
                aria-label="Send"
              >
                <Send className="size-4" />
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onPick,
  disabled,
}: {
  onPick: (s: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <p className="font-display text-3xl font-semibold tracking-[0.18em] text-fog">HIVE</p>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-mist">
        Tell MC what you want. Attach a file or image if it helps. The swarm stays behind the scenes unless you open status.
      </p>
      <ul className="mt-8 flex w-full max-w-md flex-col gap-2">
        {STARTERS.map((s) => (
          <li key={s}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(s)}
              className="w-full rounded-lg border border-line bg-navy-2 px-4 py-3 text-left text-sm text-mist transition-colors duration-150 hover:border-honey/35 hover:text-fog"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessageBubble({
  message,
  artifactTitle,
  artifactReady,
}: {
  message: ChatMessage;
  artifactTitle?: string;
  artifactReady?: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <article
      className={cn(
        "mb-5 rise-in",
        isUser ? "ml-8 sm:ml-16" : "mr-4",
      )}
    >
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
        {isUser ? "You" : "MC"}
      </p>
      <div
        className={cn(
          "rounded-lg px-3.5 py-3 text-sm leading-relaxed",
          isUser
            ? "border border-line bg-navy-3 text-fog"
            : "bg-transparent px-0 text-fog",
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.attachments && message.attachments.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {message.attachments.map((f) => (
              <li key={f.id} className="overflow-hidden rounded-md border border-line">
                {f.kind === "image" && f.dataUrl ? (
                  <img src={f.dataUrl} alt={f.name} className="h-24 w-24 object-cover" />
                ) : (
                  <span className="block px-2 py-1.5 text-xs text-mist">{f.name}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {message.hasArtifact && artifactTitle && (
        <div className="mt-3">
          <ResultBlock title={artifactTitle} ready={Boolean(artifactReady)} />
        </div>
      )}
    </article>
  );
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
