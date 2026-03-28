import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { searchProducts } from '../services/search';
import type { SearchParams } from '../../types/env';

const search = new Hono<{ Bindings: Env }>();

/**
 * GET /api/search?q=กระเบื้อง&lat=13.7563&lng=100.5018&radius_km=10
 * Main product search endpoint
 */
search.get('/', async (c) => {
  const url = new URL(c.req.url);
  const params: SearchParams = {
    q: url.searchParams.get('q') || '',
    lat: url.searchParams.has('lat') ? parseFloat(url.searchParams.get('lat')!) : undefined,
    lng: url.searchParams.has('lng') ? parseFloat(url.searchParams.get('lng')!) : undefined,
    radius_km: parseFloat(url.searchParams.get('radius_km') || c.env.MAX_SEARCH_RADIUS_KM),
    category: url.searchParams.get('category') || undefined,
    district: url.searchParams.get('district') || undefined,
    in_stock_only: url.searchParams.get('in_stock') === '1',
    sort: (url.searchParams.get('sort') as SearchParams['sort']) || 'distance',
    page: parseInt(url.searchParams.get('page') || '1', 10),
    per_page: parseInt(url.searchParams.get('per_page') || c.env.RESULTS_PER_PAGE, 10),
  };

  if (!params.q && !params.category && !params.district) {
    return c.json({ success: false, error: 'Please provide a search query (q), category, or district' }, 400);
  }

  try {
    const { results, total } = await searchProducts(c.env, params);
    return c.json({
      success: true,
      data: results,
      meta: {
        page: params.page || 1,
        per_page: params.per_page || 20,
        total,
        query: params.q,
      },
    });
  } catch (err) {
    console.error('Search error:', err);
    return c.json({ success: false, error: 'Search failed' }, 500);
  }
});

/**
 * GET /api/search/suggestions?q=กระ
 * Autocomplete suggestions
 */
search.get('/suggestions', async (c) => {
  const q = c.req.query('q') || '';
  if (q.length < 2) {
    return c.json({ success: true, data: [] });
  }

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT DISTINCT name, name_normalized FROM products
      WHERE name LIKE ?1 OR name_normalized LIKE ?1
      LIMIT 10
    `).bind(`%${q}%`).all();

    return c.json({ success: true, data: results });
  } catch {
    return c.json({ success: true, data: [] });
  }
});

/**
 * GET /api/search/trending
 * Popular searches in the last 24 hours
 */
search.get('/trending', async (c) => {
  try {
    const cached = await c.env.CACHE.get('trending:searches', 'json');
    if (cached) return c.json({ success: true, data: cached });

    const { results } = await c.env.DB.prepare(`
      SELECT query, COUNT(*) as count
      FROM search_logs
      WHERE created_at > datetime('now', '-1 day')
      AND query != ''
      GROUP BY query
      ORDER BY count DESC
      LIMIT 10
    `).all();

    await c.env.CACHE.put('trending:searches', JSON.stringify(results), { expirationTtl: 600 });
    return c.json({ success: true, data: results });
  } catch {
    return c.json({ success: true, data: [] });
  }
});

export default search;
