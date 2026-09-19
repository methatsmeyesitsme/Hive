import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-line bg-navy-3 px-3 text-sm text-fog placeholder:text-dim",
        "transition-[border-color,box-shadow] duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey/50 focus-visible:border-honey/40",
        "disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
