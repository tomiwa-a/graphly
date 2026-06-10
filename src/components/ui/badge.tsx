import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors font-heading",
  {
    variants: {
      variant: {
        default: "bg-primary-light text-primary-dark",
        secondary: "bg-surface-muted text-foreground-secondary",
        outline: "bg-surface-card text-foreground border border-border",
        success: "bg-success-light text-success-dark",
        warning: "bg-warning-light text-warning-dark",
        destructive: "bg-destructive-light text-destructive-dark",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = VariantProps<typeof badgeVariants> & {
  className?: string;
  children?: React.ReactNode;
};

export function Badge({ variant, className, children }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {children}
    </span>
  );
}

const difficultyConfig = {
  beginner: { variant: "success" as const, label: "Beginner" },
  intermediate: { variant: "warning" as const, label: "Intermediate" },
  advanced: { variant: "destructive" as const, label: "Advanced" },
} as const;

type DifficultyLevel = keyof typeof difficultyConfig;

export function DifficultyBadge({
  level,
  className,
}: {
  level: DifficultyLevel;
  className?: string;
}) {
  const config = difficultyConfig[level];
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

