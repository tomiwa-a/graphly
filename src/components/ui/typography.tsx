import { cn } from "@/lib/utils";
import React from "react";

type HeadingElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type HeadingProps = {
  as?: HeadingElement;
  className?: string;
  children: React.ReactNode;
};

export function Heading({ as = "h2", className, children }: HeadingProps) {
  const Tag = as;
  
  const styles: Record<HeadingElement, string> = {
    h1: "text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]",
    h2: "text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-[1.2]",
    h3: "text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-[1.25]",
    h4: "text-lg sm:text-xl font-medium tracking-tight text-foreground",
    h5: "text-base font-medium tracking-tight text-foreground",
    h6: "text-sm font-medium tracking-tight text-foreground",
  };

  return (
    <Tag className={cn("font-heading font-semibold text-foreground", styles[as], className)}>
      {children}
    </Tag>
  );
}

type TextProps = {
  as?: "p" | "span" | "div" | "label";
  variant?: "default" | "secondary" | "muted" | "success" | "warning" | "destructive";
  size?: "xs" | "sm" | "default" | "lg" | "xl";
  className?: string;
  children: React.ReactNode;
};

export function Text({
  as = "p",
  variant = "default",
  size = "default",
  className,
  children,
}: TextProps) {
  const Tag = as;

  const sizeStyles = {
    xs: "text-xs leading-none",
    sm: "text-sm leading-relaxed",
    default: "text-base leading-relaxed",
    lg: "text-lg leading-relaxed",
    xl: "text-xl leading-relaxed",
  };

  const variantStyles = {
    default: "text-foreground",
    secondary: "text-foreground-secondary",
    muted: "text-foreground-muted",
    success: "text-success-dark",
    warning: "text-warning-dark",
    destructive: "text-destructive-dark",
  };

  return (
    <Tag className={cn("font-sans", sizeStyles[size], variantStyles[variant], className)}>
      {children}
    </Tag>
  );
}
