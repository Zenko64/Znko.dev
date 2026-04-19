/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ROUTES } from "@znko/consts";
import { client } from "@/lib/client";
import type { InferResponseType } from "hono/client";

export type User = InferResponseType<typeof client.api.auth.profile.$get>;

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); // Current User
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await client.api.auth.profile.$get();
      setUser(res.ok ? await res.json() : null);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchUser().finally(() => setLoading(false));
  }, []);

  const login = () => {
    window.location.href =
      ROUTES.auth.base +
      ROUTES.auth.login +
      "?redirect=" +
      encodeURIComponent(window.location.href);
  };

  const logout = () => {
    window.location.href = ROUTES.auth.base + ROUTES.auth.logout;
  };

  const refreshUser = () => fetchUser();

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
