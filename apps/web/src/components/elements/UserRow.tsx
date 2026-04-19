import { UserFillIcon } from "raster-react";
import { cn } from "@/lib/utils";

export function UserRow({
  avatarUrl,
  displayName,
  size = "sm",
  className,
}: {
  avatarUrl?: string | null;
  displayName?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span className={cn("flex flex-row items-center gap-1.5", className)}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName ?? ""}
          className={size === "md" ? "size-6 object-cover shrink-0" : "h-[1em] w-auto"}
        />
      ) : (
        <UserFillIcon />
      )}
      <span className="text-xs">{displayName}</span>
    </span>
  );
}
