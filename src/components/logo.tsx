import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      style={{ color: "var(--color-primary)" }}
    >
      <path d="M16 5L8 24" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <path d="M16 5L24 24" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <path d="M10 22L22 22" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <circle cx="16" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="5" r="3.5" fill="currentColor" opacity="0.1" />
      <circle cx="8" cy="24" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function LogoFull({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="h-5 w-5" />
      <span className="text-base font-semibold tracking-tight text-foreground">
        Graphy
      </span>
    </span>
  );
}
