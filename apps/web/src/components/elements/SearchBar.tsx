import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks";
import { cn } from "@/lib/utils";

/**
 * @name SearchBar
 * @description A debounced search input. Owns the raw input value internally
 * and emits only the debounced value to the parent via `onSearch`. This keeps
 * callers from repeating the `useState + useDebounce + Input` trio per page.
 */
export function SearchBar({
  placeholder = "Search...",
  delay = 300,
  className,
  onSearch,
}: {
  placeholder?: string;
  delay?: number;
  className?: string;
  // Fired with the debounced value — parent stores this for queries.
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const debounced = useDebounce(value, delay);

  useEffect(() => {
    onSearch(debounced);
  }, [debounced, onSearch]);

  return (
    <Input
      type="text"
      placeholder={placeholder}
      className={cn("w-full", className)}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
