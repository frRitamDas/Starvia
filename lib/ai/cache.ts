import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { stableHash } from "@/lib/utils";

/**
 * Two-layer content cache for expensive generations.
 *
 *  1. In-process LRU — instant, per serverless instance.
 *  2. `ai_cache` table in Supabase — shared across instances and users, so a
 *     Class 10 CBSE "Electricity" tutorial is generated once for everyone.
 *
 * Cached content never consumes a user's daily quota and never hits the model.
 */

export interface CacheEntry<T> {
  key: string;
  kind: string;
  payload: T;
  model: string | null;
  hitCount?: number;
  createdAt?: string;
}

export function contentKey(kind: string, parts: Record<string, unknown>) {
  const normalised = Object.entries(parts)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value).toLowerCase().trim()}`)
    .join("|");
  return `${kind}:${stableHash(`${kind}|${normalised}`)}`;
}

const MAX_MEMORY_ENTRIES = 120;
const memory = new Map<string, CacheEntry<unknown>>();

function memoryGet<T>(key: string): CacheEntry<T> | null {
  const entry = memory.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  // refresh recency
  memory.delete(key);
  memory.set(key, entry as CacheEntry<unknown>);
  return entry;
}

function memorySet<T>(entry: CacheEntry<T>) {
  memory.set(entry.key, entry as CacheEntry<unknown>);
  if (memory.size > MAX_MEMORY_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
}

export function invalidateMemory(key: string) {
  memory.delete(key);
}

export function clearMemoryCache() {
  memory.clear();
}

/** Structural type of the Supabase client used for cache reads/writes. */
type CacheClient = SupabaseClient<Database> | null | undefined;

/**
 * Read-through cache. `fetcher` only runs on a miss.
 * Cache failures are non-fatal — the product keeps working without Supabase cache.
 */
export async function withContentCache<T>(options: {
  key: string;
  kind: string;
  supabase?: CacheClient;
  ttlSeconds?: number;
  fetcher: () => Promise<{ payload: T; model?: string | null; tokens?: number }>;
  onHit?: (entry: CacheEntry<T>) => void;
}): Promise<{ payload: T; model: string | null; cached: boolean; tokens?: number }> {
  const { key, kind, supabase, ttlSeconds = 60 * 60 * 24 * 45 } = options;

  const local = memoryGet<T>(key);
  if (local) {
    options.onHit?.(local);
    return { payload: local.payload, model: local.model, cached: true };
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("ai_cache")
        .select("payload, model, created_at, hit_count")
        .eq("cache_key", key)
        .maybeSingle();
      if (!error && data) {
        const row = data as unknown as { payload: T; model: string | null; created_at: string; hit_count: number };
        const ageSeconds = (Date.now() - new Date(row.created_at).getTime()) / 1000;
        if (ageSeconds <= ttlSeconds) {
          const entry: CacheEntry<T> = { key, kind, payload: row.payload, model: row.model };
          memorySet(entry);
          options.onHit?.(entry);
          return { payload: row.payload, model: row.model, cached: true };
        }
      }
    } catch {
      // ignore cache errors
    }
  }

  const fresh = await options.fetcher();
  const entry: CacheEntry<T> = {
    key,
    kind,
    payload: fresh.payload,
    model: fresh.model ?? null,
  };
  memorySet(entry);

  if (supabase) {
    try {
      await supabase.from("ai_cache").upsert(
        {
          cache_key: key,
          kind,
          payload: fresh.payload as never,
          model: fresh.model ?? null,
          tokens_used: fresh.tokens ?? 0,
          created_at: new Date().toISOString(),
        },
        { onConflict: "cache_key" },
      );
    } catch {
      // ignore cache write errors
    }
  }

  return { payload: fresh.payload, model: fresh.model ?? null, cached: false, tokens: fresh.tokens };
}
