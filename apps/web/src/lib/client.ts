import { hc } from "hono/client";
import type { AppType } from "@/../../backend/src/core/server";
export async function assertOk(res: Response) {
  if (res.ok) return;
  if (res.headers.get("content-type")?.includes("application/json")) {
    const { error } = (await res.json()) as { error: string };
    throw new Error(error ?? `HTTP ${res.status}`);
  }
  throw new Error(`HTTP ${res.status}`);
}

export const client = hc<AppType>("/");
