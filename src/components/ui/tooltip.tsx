import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-md border border-line bg-navy-3 px-2 py-1 text-xs text-fog shadow-panel",
          "data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
          "origin-[var(--radix-tooltip-content-transform-origin)] scale-[0.98] data-[state=open]:scale-100",
          "transition-[opacity,transform] duration-150",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
