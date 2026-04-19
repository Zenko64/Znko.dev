import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Games } from "./pages/Games";
import { Posts } from "./pages/Posts";
import { ThemeProvider } from "./providers/ThemeProvider";
import "./assets/css/index.css";
import { Layout } from "./components/layout/Index";
import type { Route } from "./types";
import { GamepadIcon, PlayIcon, FileTextIcon, HomeIcon } from "raster-react";
import { TooltipProvider } from "./components/ui/tooltip";
import { AuthProvider } from "./providers/AuthProvider";
import { Videos } from "./pages/Videos";
import { VideoDetail } from "./pages/Video";
import { Home } from "./pages/Home";

const routes: Route[] = [
  {
    path: "/",
    element: <Home />,
    navbar: { icon: <HomeIcon />, tooltip: "Home" },
  },
  {
    path: "/games",
    element: <Games />,
    navbar: { icon: <GamepadIcon />, tooltip: "Games" },
  },
  {
    path: "/videos",
    element: <Videos />,
    navbar: { icon: <PlayIcon />, tooltip: "Videos" },
  },
  {
    path: "/posts",
    element: <Posts />,
    navbar: { icon: <FileTextIcon />, tooltip: "Posts" },
  },
];

const browserRoutes = createBrowserRouter([
  {
    element: <Layout routes={routes} />,
    children: [
      ...routes.map(({ path, element }) => ({ path, element })),
      { path: "/games/:slug", element: <Games /> },
      { path: "/videos/:nanoid", element: <VideoDetail /> },
    ],
  },
]);

document.body.setAttribute("id", "root");
createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="ui-theme">
        <AuthProvider>
          <TooltipProvider>
            <RouterProvider router={browserRoutes} />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
);
