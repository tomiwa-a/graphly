import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { cn } from "@/lib/utils";

type AvatarProps = {
  src?: string;
  alt?: string;
  fallback: string;
  size?: "sm" | "default" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  default: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Avatar({
  src,
  alt,
  fallback,
  size = "default",
  className,
}: AvatarProps) {
  return (
    <BaseAvatar.Root
      className={cn(
        "relative inline-flex shrink-0 rounded-full",
        sizeMap[size],
        className,
      )}
    >
      {src ? (
        <BaseAvatar.Image
          src={src}
          alt={alt ?? fallback}
          className="h-full w-full rounded-full object-cover"
        />
      ) : null}
      <BaseAvatar.Fallback
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full bg-primary-light font-medium text-primary",
        )}
      >
        {fallback.charAt(0).toUpperCase()}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
}
