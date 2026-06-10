import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-150 select-none shadow-button",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white hover:bg-primary-dark active:bg-primary-dark",
        secondary:
          "bg-secondary/10 text-secondary hover:bg-secondary/15 active:bg-secondary/20",
        outline:
          "border border-input bg-surface-card hover:bg-surface-hover active:bg-surface-hover text-foreground",
        ghost:
          "bg-transparent hover:bg-surface-hover active:bg-surface-hover text-foreground shadow-none",
        destructive:
          "bg-destructive text-white hover:bg-rose-600 active:bg-rose-700",
        link: "bg-transparent text-primary hover:underline underline-offset-4 shadow-none",
      },
      size: {
        sm: "h-8 px-3 text-xs gap-1.5",
        default: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonProps = VariantProps<typeof buttonVariants> & {
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
} & React.ComponentPropsWithoutRef<typeof BaseButton>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, loading, disabled, className, children, ...props }, ref) => {
    return (
      <BaseButton
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </BaseButton>
    );
  },
);

Button.displayName = "Button";
