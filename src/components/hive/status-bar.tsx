import { useHiveStore } from "@/lib/hive/store";
import { cn } from "@/lib/utils";

export function StatusBar({ onOpenStatus }: { onOpenStatus: () => void }) {
  const status = useHiveStore((s) => s.status);
  const phase = useHiveStore((s) => s.phase);
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
    </button>
  );
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
