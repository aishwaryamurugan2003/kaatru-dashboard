// Simple in-memory cache, cleared on page refresh
const cache: Record<string, { data: any; ts: number }> = {};
const TTL = 5 * 60 * 1000; // 5 minutes

export function getCache<T>(key: string): T | null {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) { 
    delete cache[key]; 
    return null; 
  }
  return entry.data as T;
}

export function setCache(key: string, data: any) {
  cache[key] = { data, ts: Date.now() };
}

export function clearCache(key: string) {
  delete cache[key];
}
