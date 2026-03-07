import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
const replitUrl = process.env.DATABASE_URL;

if (!supabaseUrl && !replitUrl) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set.",
  );
}

const dbUrl = supabaseUrl || replitUrl!;

const client = postgres(dbUrl, {
  prepare: false,
  ssl: "require",
});

export const db = drizzle(client, { schema });

export const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
