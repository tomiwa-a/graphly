import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-150 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white hover:bg-primary-dark active:scale-[0.98] shadow-button",
        secondary:
          "bg-primary-light text-primary hover:bg-primary-muted active:scale-[0.98]",
        outline:
          "border border-border bg-surface-card text-foreground hover:bg-surface-hover hover:border-border-hover active:scale-[0.98]",
        ghost:
          "text-foreground-secondary hover:text-foreground hover:bg-surface-hover active:scale-[0.98]",
        link: "text-primary hover:text-primary-dark underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs gap-1.5",
        default: "h-9 px-4",
        lg: "h-10 px-5 text-base",
        icon: "h-9 w-9",
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
  className?: string;
  children?: React.ReactNode;
} & React.ComponentPropsWithoutRef<"button">;

export function Button({
  variant,
  size,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  );
}
