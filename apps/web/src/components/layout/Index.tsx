import { Outlet, useLocation, useNavigate } from "react-router";
import { Navbar } from "./Navbar";
import { ProfileMenu } from "../profile/ProfileMenu";
import type { NavItem, Route } from "@/types";
import { ScrollArea } from "../ui/scroll-area";
import { motion } from "motion/react";
import { ConstellationBackground } from "../ui/constellation";
import { useEffect, useRef, useState } from "react";

export function Layout({ routes }: { routes: Route[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    // If the scrollable area is taller than its parent, set is Overflowing to true
    const check = () =>
      setIsOverflowing(el.scrollHeight > (el.parentElement?.clientHeight ?? 0));
    check();

    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [location.pathname]);

  const routeButtons: NavItem[] = routes
    .filter((r) => r.navbar)
    .map((r) => ({
      ...r.navbar!,
      button: { onClick: () => navigate(r.path) },
    }));

  // Create the button for the profile
  const profileItem: NavItem = {
    icon: null,
    tooltip: "Profile",
    position: "right",
    render: () => <ProfileMenu />,
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ConstellationBackground className="fixed inset-0 -z-1" />
      <ScrollArea
        className="flex-1 min-h-0"
        scrollbarClassName={`!top-(--navbar-height) !h-[calc(100%-var(--navbar-height))] transition-opacity duration-300 ${isOverflowing ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <motion.main
          ref={mainRef}
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="pt-(--navbar-height) min-h-full"
        >
          <Outlet />
        </motion.main>
      </ScrollArea>

      <Navbar items={[...routeButtons, profileItem]} />
    </div>
  );
}
