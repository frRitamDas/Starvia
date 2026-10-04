#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import process from "node:process";
import pg from "pg";

const connectionString = (process.env.SUPABASE_DB_URL ?? "").trim();
if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL. Copy the Postgres connection string from Supabase → Project Settings → Database.");
  process.exit(1);
}

const sql = await readFile(new URL("../sql/schema.sql", import.meta.url), "utf8");
const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  statement_timeout: 120_000,
});

try {
  console.log("Connecting to Supabase Postgres…");
  await client.connect();
  console.log("Applying sql/schema.sql in a transaction…");
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log("Starvia schema applied successfully.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Schema setup failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
