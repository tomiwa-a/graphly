import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Crumb = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: Crumb[];
  className?: string;
};

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center gap-1 text-sm", className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.label} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-foreground-muted" />
            )}
            {isLast || !item.href ? (
              <span
                className={cn(
                  isLast
                    ? "font-semibold text-foreground"
                    : "text-foreground-secondary",
                )}
              >
                {item.label}
              </span>
            ) : (
              <a
                href={item.href}
                className="text-foreground-secondary hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            )}
          </span>
        );
      })}
    </nav>
  );
}
