import { cn } from "@/lib/utils";

export function TagList({
  tags,
  variant = "outline",
  className,
}: {
  tags: string[];
  variant?: "outline" | "solid";
  className?: string;
}) {
  if (!tags.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tags.map((tag) => (
        <span
          key={tag}
          className={
            variant === "solid"
              ? "inline-block bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-full"
              : "text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary/80 font-mono leading-none"
          }
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
