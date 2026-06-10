import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary-light text-primary",
        secondary: "bg-surface-muted text-foreground-secondary border border-border",
        destructive: "bg-destructive-light text-destructive",
        outline: "border border-input text-foreground bg-transparent",
        success: "bg-success-light text-success",
        warning: "bg-warning-light text-accent",
      },
      size: {
        sm: "px-2 py-0 text-[10px]",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type BadgeProps = VariantProps<typeof badgeVariants> & {
  className?: string;
  children?: React.ReactNode;
};

export function Badge({ variant, size, className, children }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)}>
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
    <Badge variant={config.variant} size="sm" className={className}>
      {config.label}
    </Badge>
  );
}

const domainColors: Record<string, { bg: string; text: string }> = {
  "api-design": { bg: "bg-domain-api-bg", text: "text-domain-api" },
  databases: { bg: "bg-domain-database-bg", text: "text-domain-database" },
  caching: { bg: "bg-domain-caching-bg", text: "text-domain-caching" },
  queues: { bg: "bg-domain-queues-bg", text: "text-domain-queues" },
  auth: { bg: "bg-domain-auth-bg", text: "text-domain-auth" },
  reliability: { bg: "bg-domain-reliability-bg", text: "text-domain-reliability" },
  observability: { bg: "bg-domain-observability-bg", text: "text-domain-observability" },
  deployment: { bg: "bg-domain-deployment-bg", text: "text-domain-deployment" },
  foundations: { bg: "bg-domain-foundations-bg", text: "text-domain-foundations" },
};

export function DomainBadge({
  domain,
  className,
}: {
  domain: string;
  className?: string;
}) {
  const colors = domainColors[domain] ?? {
    bg: "bg-surface-hover",
    text: "text-foreground-secondary",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors.bg,
        colors.text,
        className,
      )}
    >
      {domain.replace(/-/g, " ")}
    </span>
  );
}
