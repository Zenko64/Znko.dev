import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ShareIcon } from "raster-react";
import { Button } from "@/components/ui/button";

export function ShareButton({
  getText = () => window.location.href,
  className,
}: {
  getText?: () => string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(getText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleClick}
      className={className ?? "min-w-[72px]"}
    >
      <ShareIcon className="size-3.5" />
      <AnimatePresence mode="wait">
        <motion.span
          key={copied ? "copied" : "share"}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.1 }}
        >
          {copied ? "Copied!" : "Share"}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
