import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "info" | "success" | "warning" | "error";

const styles: Record<Variant, string> = {
  info: "bg-[var(--color-muted)] text-[var(--color-foreground)] border-[var(--color-border)]",
  success: "bg-[var(--color-success)]/15 text-[var(--color-foreground)] border-[var(--color-success)]/40",
  warning: "bg-[var(--color-accent)]/20 text-[var(--color-foreground)] border-[var(--color-accent)]/50",
  error: "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] border-[var(--color-destructive)]/30",
};

export function Alert({
  variant = "info",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  return (
    <div
      role="alert"
      className={cn("rounded-xl border p-4 text-sm", styles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
