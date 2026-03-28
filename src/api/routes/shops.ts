import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { parsePagination } from '../../utils/helpers';

const shops = new Hono<{ Bindings: Env }>();

/**
 * GET /api/shops
 * List shops with optional filters
 */
shops.get('/', async (c) => {
  const district = c.req.query('district');
  const verified = c.req.query('verified');
  const { page, perPage, offset } = parsePagination(c.req.query('page'), c.req.query('per_page'));

  let sql = 'SELECT * FROM shops';
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (district) {
    conditions.push(`district = ?${values.length + 1}`);
    values.push(district);
  }
  if (verified === '1') {
    conditions.push(`is_verified = 1`);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ` ORDER BY google_rating DESC LIMIT ${perPage} OFFSET ${offset}`;

  const stmt = values.length > 0 ? c.env.DB.prepare(sql).bind(...values) : c.env.DB.prepare(sql);
  const { results } = await stmt.all();

  return c.json({
    success: true,
    data: results,
    meta: { page, per_page: perPage, total: results?.length || 0 },
  });
});

/**
 * GET /api/shops/:id
 * Shop detail with its products
 */
shops.get('/:id', async (c) => {
  const id = c.req.param('id');

  const shop = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ?1').bind(id).first();
  if (!shop) {
    return c.json({ success: false, error: 'Shop not found' }, 404);
  }

  const { results: products } = await c.env.DB.prepare(`
    SELECT p.*, i.price, i.price_unit, i.in_stock, i.stock_quantity, i.last_confirmed
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    WHERE i.shop_id = ?1
    ORDER BY i.in_stock DESC, p.name ASC
  `).bind(id).all();

  return c.json({
    success: true,
    data: { shop, products },
  });
});

/**
 * GET /api/shops/:id/products
 * Products available at a specific shop
 */
shops.get('/:id/products', async (c) => {
  const id = c.req.param('id');
  const { page, perPage, offset } = parsePagination(c.req.query('page'), c.req.query('per_page'));

  const { results } = await c.env.DB.prepare(`
    SELECT p.*, i.price, i.price_unit, i.in_stock, i.stock_quantity
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    WHERE i.shop_id = ?1
    ORDER BY i.in_stock DESC, p.name ASC
    LIMIT ${perPage} OFFSET ${offset}
  `).bind(id).all();

  return c.json({
    success: true,
    data: results,
    meta: { page, per_page: perPage, total: results?.length || 0 },
  });
});

export default shops;
