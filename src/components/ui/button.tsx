import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 text-sm font-semibold select-none border border-transparent font-heading tracking-wide transition-all duration-200 ease-graphy cursor-pointer hover:scale-[1.01] active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-dark shadow-button hover:bg-primary/90",
        secondary:
          "bg-success text-success-dark shadow-button hover:bg-success/90",
        accent:
          "bg-accent text-accent-dark shadow-button hover:bg-accent/90",
        outline:
          "bg-surface-card text-foreground border-border shadow-button hover:bg-surface-hover",
        ghost:
          "border-transparent bg-transparent text-foreground-secondary hover:text-foreground hover:bg-surface-hover shadow-none hover:scale-100 active:scale-95",
        link: "border-transparent bg-transparent text-primary-dark underline-offset-4 hover:underline shadow-none p-0 h-auto hover:scale-100 active:scale-100",
      },
      size: {
        sm: "h-9 px-4 text-xs gap-1.5 rounded-xl",
        default: "h-11 px-5 text-sm rounded-2xl",
        lg: "h-13 px-6 text-base rounded-2xl",
        icon: "h-11 w-11 p-0 rounded-2xl",
        "icon-sm": "h-9 w-9 p-0 rounded-xl",
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

