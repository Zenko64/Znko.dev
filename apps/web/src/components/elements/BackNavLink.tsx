import { Link } from "react-router";
import { ArrowLeftIcon } from "raster-react";

export function BackNavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="text-[10px] flex flex-row items-center font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
    >
      <ArrowLeftIcon /> {label}
    </Link>
  );
}
