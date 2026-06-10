"use client";

import { Toaster as SonnerToaster } from "sonner";
import { CircleCheck, TriangleAlert, OctagonX, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerToaster
      className="toaster group"
      icons={{
        success: <CircleCheck className="h-4 w-4 text-success" />,
        warning: <TriangleAlert className="h-4 w-4 text-warning" />,
        error: <OctagonX className="h-4 w-4 text-destructive" />,
        info: <Info className="h-4 w-4 text-info" />,
        loading: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-dropdown group-[.toaster]:rounded-lg",
          title: "text-sm font-medium",
          description: "text-xs text-foreground-secondary",
          success:
            "group-[.toast]:border-l-success group-[.toast]:border-l-4",
          warning:
            "group-[.toast]:border-l-warning group-[.toast]:border-l-4",
          error: "group-[.toast]:border-l-destructive group-[.toast]:border-l-4",
          info: "group-[.toast]:border-l-info group-[.toast]:border-l-4",
        },
      }}
      {...props}
    />
  );
}
