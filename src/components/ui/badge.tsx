import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "mist",
  ...props
}: React.ComponentProps<"span"> & { tone?: "mist" | "honey" | "ok" | "danger" }) {
  const tones = {
    mist: "bg-navy-4 text-mist border-line",
    honey: "bg-honey/12 text-honey border-honey/25",
    ok: "bg-ok/12 text-ok border-ok/25",
    danger: "bg-danger/12 text-danger border-danger/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
