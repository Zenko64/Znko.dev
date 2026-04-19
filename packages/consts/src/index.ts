export const ROUTES = {
  base: "/api",
  games: "/api/games",
  posts: "/api/posts",
  videos: "/api/videos",
  uploads: "/api/uploads",
  presence: "/api/presence",
  profiles: "/api/profiles",
  auth: {
    base: "/api/auth",
    login: "/login",
    logout: "/logout",
    profile: "/profile",
    callback: "/callback",
    devLogin: "/dev/login",
  },
} as const;
