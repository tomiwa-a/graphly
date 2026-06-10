import { cn } from "@/lib/utils";

type CardProps = {
  className?: string;
  children?: React.ReactNode;
  hover?: boolean;
};

export function Card({ className, children, hover }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface-card p-6 shadow-card",
        hover && "transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <h3 className={cn("text-lg font-semibold text-foreground", className)}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <p className={cn("mt-1 text-sm text-foreground-secondary", className)}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <div className={cn(className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mt-4 flex items-center gap-2 border-t border-border pt-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
