import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "@/db/schema";

type DbType = NeonDatabase<typeof schema>;

let instance: DbType | null = null;

// Use the WebSocket-based neon-serverless driver (Pool) rather than neon-http,
// because we need real transactions (db.transaction + advisory locks) for the
// atomic rate-limit-and-insert path. The neon-http driver does not support
// transactions.
//
// Construction is lazy via a Proxy: building the Pool at module load would read
// process.env.DATABASE_URL during `next build` (where it is absent) and crash
// page-data collection. The Proxy defers creation until the first query.
function getDb(): DbType {
  if (instance) return instance;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  instance = drizzle(pool, { schema });
  return instance;
}

export const db = new Proxy({} as DbType, {
  get(_target, prop) {
    const real = getDb();
    const value = real[prop as keyof DbType];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
