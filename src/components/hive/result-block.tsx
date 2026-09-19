import { ArrowRight } from "lucide-react";
import { useHiveStore } from "@/lib/hive/store";

export function ResultBlock({ title, ready }: { title: string; ready: boolean }) {
  const setPreviewOpen = useHiveStore((s) => s.setPreviewOpen);

  return (
    <button
      type="button"
      onClick={() => ready && setPreviewOpen(true)}
      disabled={!ready}
      className="group w-full max-w-md rounded-xl border border-honey/30 bg-navy-3 px-5 py-6 text-left transition-[border-color,transform] duration-200 hover:border-honey/60 active:scale-[0.99] disabled:opacity-60"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-honey">Hive finished</p>
      <p className="mt-2 font-display text-lg font-semibold tracking-tight text-fog">{title}</p>
      <p className="mt-1 text-sm text-mist">{ready ? "Ready to preview" : "Integrating…"}</p>
      <p className="mt-4 flex items-center gap-1 text-sm text-honey">
        Click to Preview
        <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
      </p>
    </button>
  );
}
