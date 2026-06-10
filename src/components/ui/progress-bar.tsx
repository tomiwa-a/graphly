import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number;
  max?: number;
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
  className?: string;
};

const sizeMap = {
  sm: "h-1.5",
  default: "h-2.5",
  lg: "h-4",
};

export function ProgressBar({
  value,
  max = 100,
  size = "default",
  showLabel,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-surface-hover",
          sizeMap[size],
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-foreground-muted">{percentage}%</p>
      )}
    </div>
  );
}
