import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { ComposeCard } from "@/components/posts/editor/ComposeCard";
import { PostLink } from "@/components/posts/PostLink";
import { PostLinkSkeleton } from "@/components/posts/PostLinkSkeleton";
import { usePostsQuery } from "@/hooks/queries/posts";
import { SearchBar } from "@/components/elements/SearchBar";
import "../assets/css/components/posts.css";
import "../assets/css/components/postEditor.css";
import { animate, AnimatePresence, motion } from "motion/react";
import { PlusIcon } from "raster-react";

export function Posts() {
  const [search, setSearch] = useState("");
  const { data: posts, isLoading } = usePostsQuery({ search });
  const [composing, setComposing] = useState(false);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get("id");

  const [animatedTarget, setAnimatedTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!targetId || isLoading) return;
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnimatedTarget(targetId);
  }, [targetId, isLoading]);

  useEffect(() => {
    if (!animatedTarget) return;
    const el = document.getElementById(animatedTarget);
    if (!el) return;
    animate(
      el,
      {
        boxShadow: [
          "0 0 0 0px var(--primary)",
          "0 0 0 6px var(--primary)",
          "0 0 0 0px var(--primary)",
          "0 0 2px 2px var(--secondary)",
        ],
      },
      { duration: 1.75, ease: "easeInOut" },
    );
    const timeout = setTimeout(() => {
      setAnimatedTarget(null);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [animatedTarget]);

  return (
    <div className="p-6">
      <span className="flex flex-row justify-between items-center gap-3">
        <div className="flex-1 max-w-sm">
          <SearchBar placeholder="Search posts..." onSearch={setSearch} />
        </div>
        <AnimatePresence mode="popLayout">
          {user && !composing && (
            <motion.div
              key="new-post-btn"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ damping: 25 }}
            >
              <Button onClick={() => setComposing(true)}>
                <PlusIcon /> New Post
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </span>
      <AnimatePresence>
        {composing && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95, rotateX: -10 }}
            animate={{ opacity: 1, height: "auto", scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, height: 0, scale: 0.95, rotateX: -10 }}
            className=""
            style={{ overflow: "hidden" }}
          >
            <ComposeCard
              onCancel={() => setComposing(false)}
              onSuccess={() => setComposing(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="postsContainer">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <PostLinkSkeleton key={i} />)
        ) : (
          <AnimatePresence mode="popLayout">
            {(posts ?? []).map((post) => (
              <motion.div
                key={post.nanoid}
                id={post.nanoid}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                style={{
                  scrollMarginTop: "calc(var(--navbar-height) + 32px)",
                }}
              >
                <PostLink post={post} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
