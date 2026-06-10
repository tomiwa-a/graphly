"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function TooltipProvider({
  children,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return <>{children}</>;
}

export function Tooltip({
  children,
  content,
  className,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={cn(
            "absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2",
            "pointer-events-none",
          )}
        >
          <div
            className={cn(
              "max-w-60 rounded-lg border border-border bg-popover px-3 py-1.5 text-sm text-foreground shadow-dropdown whitespace-nowrap",
              className,
            )}
          >
            {content}
          </div>
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-border" />
        </div>
      )}
    </div>
  );
}
