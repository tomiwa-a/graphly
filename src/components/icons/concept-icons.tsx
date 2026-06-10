import { cn } from "@/lib/utils";

function IconWrap({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("shrink-0", className)} aria-hidden="true">
      {children}
    </svg>
  );
}

export function IconIdempotency({ className }: { className?: string }) {
  return (
    <IconWrap className={className}>
      <path d="M12 4a8 8 0 1 1-5.66 13.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 12l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 15l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </IconWrap>
  );
}

export function IconIndexes({ className }: { className?: string }) {
  return (
    <IconWrap className={className}>
      <line x1="12" y1="3" x2="12" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="10" x2="7" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="10" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="7" y1="17" x2="7" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17" y1="17" x2="17" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="3" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="17" r="2" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="17" cy="17" r="2" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    </IconWrap>
  );
}

export function IconCircuitBreaker({ className }: { className?: string }) {
  return (
    <IconWrap className={className}>
      <line x1="3" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="7" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </IconWrap>
  );
}

export function IconHttp({ className }: { className?: string }) {
  return (
    <IconWrap className={className}>
      <path d="M13 7l4 5-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 7l-4 5 4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
      <line x1="7" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <line x1="7" y1="19" x2="17" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
    </IconWrap>
  );
}

export function IconQueue({ className }: { className?: string }) {
  return (
    <IconWrap className={className}>
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="8" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <line x1="8" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </IconWrap>
  );
}

export function IconCache({ className }: { className?: string }) {
  return (
    <IconWrap className={className}>
      <rect x="4" y="4" width="16" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4" y="10" width="16" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <rect x="4" y="16" width="12" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    </IconWrap>
  );
}
