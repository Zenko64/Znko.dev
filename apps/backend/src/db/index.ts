import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { env } from "#core/env";
import { migrate } from "drizzle-orm/postgres-js/migrator";

export type DbOrTx =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

const sql = postgres(env.DATABASE_URL, {
  onnotice: () => {},
});

export const db = drizzle(sql, { schema });

export async function checkDb() {
  await sql`SELECT 1`;
  await migrate(db, { migrationsFolder: "./drizzle" });
}
