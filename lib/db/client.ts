import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@/db/schema";

type DbType = NeonHttpDatabase<typeof schema>;

let instance: DbType | null = null;

// Lazily construct the Neon client on first use. Constructing it at module load
// would call neon(process.env.DATABASE_URL!) during `next build` (when the env
// var is absent) and crash page-data collection. A proxy defers creation until
// a query actually runs at request time.
function getDb(): DbType {
  if (instance) return instance;
  const sql = neon(process.env.DATABASE_URL!);
  instance = drizzle(sql, { schema });
  return instance;
}

export const db = new Proxy({} as DbType, {
  get(_target, prop) {
    const real = getDb();
    const value = real[prop as keyof DbType];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
