import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 text-sm font-semibold select-none border-2 border-border font-heading tracking-wide transition-all duration-100 ease-out cursor-pointer active:translate-y-[2px] active:shadow-[0_2px_0_0_var(--color-border)]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-foreground shadow-[0_4px_0_0_var(--color-border)] hover:-translate-y-[1px] hover:shadow-[0_5px_0_0_var(--color-border)] active:translate-y-[2px] active:shadow-[0_2px_0_0_var(--color-border)]",
        secondary:
          "bg-success text-foreground shadow-[0_4px_0_0_var(--color-border)] hover:-translate-y-[1px] hover:shadow-[0_5px_0_0_var(--color-border)] active:translate-y-[2px] active:shadow-[0_2px_0_0_var(--color-border)]",
        accent:
          "bg-accent text-foreground shadow-[0_4px_0_0_var(--color-border)] hover:-translate-y-[1px] hover:shadow-[0_5px_0_0_var(--color-border)] active:translate-y-[2px] active:shadow-[0_2px_0_0_var(--color-border)]",
        outline:
          "bg-surface-card text-foreground shadow-[0_4px_0_0_var(--color-border)] hover:-translate-y-[1px] hover:shadow-[0_5px_0_0_var(--color-border)] active:translate-y-[2px] active:shadow-[0_2px_0_0_var(--color-border)]",
        ghost:
          "border-transparent bg-transparent text-foreground-secondary hover:text-foreground hover:bg-surface-hover shadow-none active:translate-y-0 active:shadow-none",
        link: "border-transparent bg-transparent text-primary-dark underline-offset-4 hover:underline shadow-none active:translate-y-0 active:shadow-none p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
        default: "h-10 px-5 text-sm rounded-xl",
        lg: "h-12 px-6 text-base rounded-2xl",
        icon: "h-10 w-10 p-0 rounded-xl",
        "icon-sm": "h-8 w-8 p-0 rounded-lg",
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

