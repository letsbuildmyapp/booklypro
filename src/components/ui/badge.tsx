import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/15 text-primary",
        accent: "border-transparent bg-accent/15 text-accent",
        outline: "text-foreground border-border",
        confirmed: "border-transparent bg-status-confirmed/15 text-status-confirmed",
        completed: "border-transparent bg-status-completed/15 text-status-completed",
        noshow: "border-transparent bg-status-noshow/15 text-status-noshow",
        cancelled: "border-transparent bg-status-cancelled/15 text-status-cancelled",
        rescheduled: "border-transparent bg-status-rescheduled/15 text-status-rescheduled",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      style={{ letterSpacing: "0.08em" }}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}
