import "../../assets/css/components/navbar.css";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import type { NavItem } from "@/types";
import { motion, type MotionProps } from "motion/react";

const MotionButton = motion.create(Button);

type NavIconButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "onAnimationStart"
> &
  Pick<
    MotionProps,
    | "animate"
    | "initial"
    | "exit"
    | "transition"
    | "whileHover"
    | "whileTap"
    | "whileFocus"
  >;

export function NavIconButton({ children, ...props }: NavIconButtonProps) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <MotionButton variant="ghost" {...(props as any)}>
      {children}
    </MotionButton>
  );
}

export function Navbar({ items }: { items: NavItem[] }) {
  const left = items.filter((i) => i.position === "left");
  const center = items.filter((i) => !i.position || i.position === "center");
  const right = items.filter((i) => i.position === "right");

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0, width: "100%" }}
      animate={{ y: 0, opacity: 1, width: "100%" }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 5,
      }}
    >
      <span className="left">
        {left.map((item) => (
          <NavButton key={item.tooltip} item={item} />
        ))}
      </span>
      <span className="center">
        {center.map((item) => (
          <NavButton key={item.tooltip} item={item} />
        ))}
      </span>
      <span className="right">
        {right.map((item) => (
          <NavButton key={item.tooltip} item={item} />
        ))}
      </span>
    </motion.nav>
  );
}

function NavButton({ item }: { item: NavItem }) {
  if (item.render) return item.render();

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <NavIconButton
            {...props}
            {...item.button}
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.75,
              y: { type: "keyframes", duration: 0.25, ease: "easeInOut" },
            }}
          >
            {item.icon}
          </NavIconButton>
        )}
      />
      <TooltipContent>
        <p>{item.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
