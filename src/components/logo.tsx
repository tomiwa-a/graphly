import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {/* Connection lines */}
      <path d="M16 5L8 24" stroke="#C0392B" strokeWidth="1.5" opacity="0.35" />
      <path d="M16 5L24 24" stroke="#C0392B" strokeWidth="1.5" opacity="0.35" />
      <path d="M10 22L22 22" stroke="#C0392B" strokeWidth="1.5" opacity="0.35" />
      {/* Primary node — solid blood red */}
      <circle cx="16" cy="5" r="3.5" fill="#C0392B" />
      {/* Secondary nodes — soft red tint */}
      <circle cx="8" cy="24" r="3" fill="#FDDCDC" stroke="#C0392B" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="3" fill="#FDDCDC" stroke="#C0392B" strokeWidth="1.5" />
    </svg>
  );
}

export function LogoFull({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="h-5 w-5" />
      <span className="text-base font-medium tracking-tight text-foreground">
        Graphly
      </span>
    </span>
  );
}
