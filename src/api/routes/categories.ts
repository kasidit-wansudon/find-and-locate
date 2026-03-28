import { Hono } from 'hono';
import type { Env } from '../../types/env';

const categories = new Hono<{ Bindings: Env }>();

/**
 * GET /api/categories
 * List all categories (cached)
 */
categories.get('/', async (c) => {
  // Check cache first
  try {
    const cached = await c.env.CACHE.get('categories:all', 'json');
    if (cached) return c.json({ success: true, data: cached });
  } catch { /* miss */ }

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM categories ORDER BY sort_order ASC, name_th ASC
  `).all();

  // Cache for 1 hour
  try {
    await c.env.CACHE.put('categories:all', JSON.stringify(results), { expirationTtl: 3600 });
  } catch { /* ok */ }

  return c.json({ success: true, data: results });
});

/**
 * GET /api/categories/:slug
 * Category detail with product count
 */
categories.get('/:slug', async (c) => {
  const slug = c.req.param('slug');

  const category = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE slug = ?1'
  ).bind(slug).first();

  if (!category) {
    return c.json({ success: false, error: 'Category not found' }, 404);
  }

  const productCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM products WHERE category_id = ?1
  `).bind(category.id).first();

  return c.json({
    success: true,
    data: {
      ...category,
      product_count: productCount?.count || 0,
    },
  });
});

export default categories;
