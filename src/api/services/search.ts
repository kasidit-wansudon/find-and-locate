import type { Env, SearchResult, SearchParams } from '../../types/env';
import { haversineDistance, buildCacheKey } from '../../utils/helpers';

const CACHE_TTL = 300; // 5 minutes

/**
 * Core search service — finds products across shops
 */
export async function searchProducts(
  env: Env,
  params: SearchParams
): Promise<{ results: SearchResult[]; total: number }> {
  // 1. Check cache
  const cacheKey = buildCacheKey('search', params as unknown as Record<string, unknown>);
  try {
    const cached = await env.CACHE.get(cacheKey, 'json') as { results: SearchResult[]; total: number } | null;
    if (cached) return cached;
  } catch { /* cache miss */ }

  // 2. Build SQL query
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  // Text search on product name + tags
  if (params.q) {
    conditions.push(`(p.name LIKE ?1 OR p.name_normalized LIKE ?1 OR p.tags LIKE ?1)`);
    values.push(`%${params.q}%`);
  }

  // Category filter
  if (params.category) {
    conditions.push(`c.name = ?${values.length + 1}`);
    values.push(params.category);
  }

  // District filter
  if (params.district) {
    conditions.push(`s.district = ?${values.length + 1}`);
    values.push(params.district);
  }

  // Stock filter
  if (params.in_stock_only) {
    conditions.push(`i.in_stock = 1`);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const sql = `
    SELECT
      s.id as shop_id, s.name as shop_name, s.name_en as shop_name_en,
      s.address, s.district, s.lat, s.lng, s.phone, s.line_id,
      s.google_rating, s.is_verified, s.opening_hours, s.photo_url,
      p.id as product_id, p.name as product_name, p.name_normalized as product_name_normalized,
      p.brand, p.image_url,
      i.price, i.price_unit, i.in_stock, i.stock_quantity, i.last_confirmed,
      c.name as category_name
    FROM inventory i
    JOIN shops s ON i.shop_id = s.id
    JOIN products p ON i.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause}
    ORDER BY s.google_rating DESC, i.in_stock DESC
    LIMIT 200
  `;

  const stmt = env.DB.prepare(sql);
  const bound = values.length > 0 ? stmt.bind(...values) : stmt;
  const { results: rows } = await bound.all();

  // 3. Calculate distances and sort
  let results: SearchResult[] = (rows || []).map((row: any) => ({
    shop: {
      id: row.shop_id,
      google_place_id: null,
      name: row.shop_name,
      name_en: row.shop_name_en,
      description: null,
      address: row.address,
      district: row.district,
      province: 'กรุงเทพ',
      lat: row.lat,
      lng: row.lng,
      phone: row.phone,
      line_id: row.line_id,
      website: null,
      photo_url: row.photo_url,
      opening_hours: row.opening_hours,
      google_rating: row.google_rating,
      is_verified: Boolean(row.is_verified),
      verified_email: null,
      source: 'google',
      created_at: '',
      updated_at: '',
    },
    product: {
      id: row.product_id,
      name: row.product_name,
      name_normalized: row.product_name_normalized,
      category_id: '',
      brand: row.brand,
      description: null,
      image_url: row.image_url,
      tags: null,
      created_at: '',
    },
    inventory: {
      id: '',
      shop_id: row.shop_id,
      product_id: row.product_id,
      price: row.price,
      price_unit: row.price_unit,
      in_stock: Boolean(row.in_stock),
      stock_quantity: row.stock_quantity,
      last_confirmed: row.last_confirmed,
      source: 'auto',
      created_at: '',
      updated_at: '',
    },
    distance_km: params.lat && params.lng
      ? haversineDistance(params.lat, params.lng, row.lat, row.lng)
      : 0,
  }));

  // Sort (no radius filter — show all results, just sort by distance)
  if (params.sort === 'distance' && params.lat && params.lng) {
    results.sort((a, b) => a.distance_km - b.distance_km);
  } else if (params.sort === 'price') {
    results.sort((a, b) => (a.inventory.price || 999999) - (b.inventory.price || 999999));
  } else {
    results.sort((a, b) => (b.shop.google_rating || 0) - (a.shop.google_rating || 0));
  }

  // Paginate
  const page = params.page || 1;
  const perPage = params.per_page || 20;
  const total = results.length;
  const paged = results.slice((page - 1) * perPage, page * perPage);

  const response = { results: paged, total };

  // 4. Cache results
  try {
    await env.CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: CACHE_TTL });
  } catch { /* cache write fail is ok */ }

  // 5. Log search (async, don't block response)
  logSearch(env, params, total).catch(() => {});

  return response;
}

async function logSearch(env: Env, params: SearchParams, resultsCount: number) {
  await env.DB.prepare(`
    INSERT INTO search_logs (query, category_id, district, lat, lng, results_count)
    VALUES (?1, NULL, ?2, ?3, ?4, ?5)
  `).bind(
    params.q || '',
    params.district || null,
    params.lat || null,
    params.lng || null,
    resultsCount
  ).run();
}
