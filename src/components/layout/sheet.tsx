"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type SheetProps = {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function Sheet({ children, open, onOpenChange }: SheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-popover shadow-modal flex flex-col">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-md p-1 text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex-1 overflow-y-auto px-4 py-6">{children}</div>
      </div>
    </>
  );
}

export function SheetTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={className} {...props}>
      {children}
    </button>
  );
}
