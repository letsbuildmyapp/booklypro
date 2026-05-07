import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid place-items-center h-9 w-9 rounded-2xl bg-[#5a8770] shadow-soft">
        <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
          <rect x="6" y="9" width="20" height="17" rx="4" fill="#fffaf0"/>
          <rect x="6" y="9" width="20" height="5" rx="4" fill="#e87856"/>
          <circle cx="11" cy="20" r="1.6" fill="#5a8770"/>
          <circle cx="16" cy="20" r="1.6" fill="#5a8770"/>
          <circle cx="21" cy="20" r="1.6" fill="#5a8770"/>
        </svg>
      </span>
      <div className="leading-none">
        <div className="text-[19px] font-semibold tracking-tight">BooklyPro</div>
      </div>
    </div>
  );
}
