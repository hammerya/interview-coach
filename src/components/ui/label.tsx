import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { hint?: string }
>(({ className, children, hint, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("block text-sm font-medium text-[var(--color-foreground)] mb-1.5", className)}
    {...props}
  >
    {children}
    {hint ? (
      <span className="ml-1 text-xs font-normal text-[var(--color-muted-foreground)]">
        {hint}
      </span>
    ) : null}
  </label>
));
Label.displayName = "Label";
