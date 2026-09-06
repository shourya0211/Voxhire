import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "outline" | "success" | "warning";
}) {
  const styles = {
    default: "bg-teal-50 text-teal-900 border-teal-200",
    secondary: "bg-slate-100 text-slate-700 border-slate-200",
    outline: "border-border bg-white text-foreground",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-900 border-amber-200",
  }[variant];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium",
        styles,
        className,
      )}
      {...props}
    />
  );
}
