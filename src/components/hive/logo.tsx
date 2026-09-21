import { cn } from "@/lib/utils";

export function HiveMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      aria-hidden="true"
    >
      <path d="M16 3.2 27.2 9.6v12.8L16 28.8 4.8 22.4V9.6L16 3.2Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16 10.2 21.4 13.3v6.4L16 22.8 10.6 19.7v-6.4L16 10.2Z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

export function HiveWordmark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-honey">
      <HiveMark />
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold tracking-[0.18em] text-fog">HIVE</span>
          <span className="mt-1 text-[9px] font-medium tracking-[0.12em] text-dim">v2.0</span>
        </div>
      )}
    </div>
  );
}
