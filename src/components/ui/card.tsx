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
        "rounded-[24px] border border-border bg-surface-card p-6 shadow-card text-foreground",
        hover && "transition-all duration-200 ease-graphy hover:scale-[1.01] hover:shadow-card-hover",
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
    <div className={cn("mb-3 flex items-start justify-between gap-4", className)}>
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
    <h3 className={cn("text-base font-semibold text-foreground font-heading", className)}>
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
    <p className={cn("mt-1 text-sm leading-relaxed text-foreground-secondary font-sans", className)}>
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
  return <div className={cn("font-sans", className)}>{children}</div>;
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
        "mt-4 flex items-center gap-2 border-t border-border pt-4 font-sans",
        className,
      )}
    >
      {children}
    </div>
  );
}

