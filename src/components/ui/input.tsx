import { Input as BaseInput } from "@base-ui/react/input";
import { forwardRef } from "react";
import { cn, focusRing } from "@/lib/utils";

type InputProps = {
  className?: string;
  error?: boolean;
} & Omit<React.ComponentPropsWithoutRef<typeof BaseInput>, "className">;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <BaseInput
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-surface-card px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted transition-colors",
          "hover:border-foreground-muted",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive",
          focusRing,
          className,
        )}
        aria-invalid={error}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
