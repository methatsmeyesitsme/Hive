import { MODEL_CLASS } from "@/lib/hive/constants";
import { useHiveStore } from "@/lib/hive/store";
import type { SplitterState } from "@/lib/hive/types";
import { cn } from "@/lib/utils";

export function StatusBar({ onOpenStatus }: { onOpenStatus: () => void }) {
  const status = useHiveStore((s) => s.status);
  const phase = useHiveStore((s) => s.phase);
  const splitters = useHiveStore((s) => s.splitters);
  const live =
    phase !== "idle" &&
    phase !== "complete" &&
    phase !== "cancelled" &&
    phase !== "error";

  return (
    <button
      type="button"
      onClick={onOpenStatus}
      className="group flex w-full flex-col gap-0.5 rounded-md px-1 py-1.5 text-left transition-colors duration-150 hover:bg-navy-3/70"
      aria-label="Open Hive status"
    >
      <StatusLine role="MC" text={status.mc} live={live} />
      <StatusLine role="HRC" text={status.hrc} live={live} />
      <StatusLine role="RO" text={status.ro} live={live} />
      {splitters.length > 0 && <StatusLine role="SP" text={splitterSummary(splitters)} live={live} />}
    </button>
  );
}

function splitterSummary(splitters: SplitterState[]): string {
  const n = splitters.length;
  if (splitters.every((s) => s.status === "summoning" && s.lieutenants.length === 0)) {
    return `Loading ${n} × ${MODEL_CLASS.splitter}`;
  }
  const done = splitters.filter((s) => s.status === "done").length;
  return done === n ? `${n} × ${MODEL_CLASS.splitter} · done` : `${n} × ${MODEL_CLASS.splitter} · ${done}/${n} done`;
}

function StatusLine({
  role,
  text,
  live,
}: {
  role: string;
  text: string;
  live: boolean;
}) {
  return (
    <p
      key={role + text}
      className={cn(
        "flex items-baseline gap-2 font-mono text-[11px] leading-relaxed text-mist/80",
        "transition-opacity duration-300",
      )}
    >
      <span className="w-8 shrink-0 text-honey/80">{role}</span>
      <span className={cn("truncate", live && "shimmer bg-clip-text")}>{text}</span>
    </p>
  );
}
