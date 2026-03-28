/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Slugify a string (Thai-safe)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Parse pagination params with defaults
 */
export function parsePagination(
  page?: string | null,
  perPage?: string | null,
  defaultPerPage = 20
): { page: number; perPage: number; offset: number } {
  const p = Math.max(1, parseInt(page || '1', 10) || 1);
  const pp = Math.min(100, Math.max(1, parseInt(perPage || String(defaultPerPage), 10) || defaultPerPage));
  return { page: p, perPage: pp, offset: (p - 1) * pp };
}

/**
 * Build a cache key from search params
 */
export function buildCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return `${prefix}:${sorted}`;
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(str: string | null, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
