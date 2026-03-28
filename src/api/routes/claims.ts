import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { generateId } from '../../utils/helpers';

const claims = new Hono<{ Bindings: Env }>();

/**
 * POST /api/claims
 * Shop owner claims their shop (starts verification)
 */
claims.post('/', async (c) => {
  const body = await c.req.json<{ shop_id: string; email: string }>();

  if (!body.shop_id || !body.email) {
    return c.json({ success: false, error: 'shop_id and email are required' }, 400);
  }

  // Check shop exists
  const shop = await c.env.DB.prepare('SELECT id, name FROM shops WHERE id = ?1')
    .bind(body.shop_id).first();
  if (!shop) {
    return c.json({ success: false, error: 'Shop not found' }, 404);
  }

  // Check no pending claim
  const existing = await c.env.DB.prepare(`
    SELECT id FROM claims WHERE shop_id = ?1 AND status = 'pending'
  `).bind(body.shop_id).first();
  if (existing) {
    return c.json({ success: false, error: 'A claim is already pending for this shop' }, 409);
  }

  const id = generateId();
  await c.env.DB.prepare(`
    INSERT INTO claims (id, shop_id, email, status)
    VALUES (?1, ?2, ?3, 'pending')
  `).bind(id, body.shop_id, body.email).run();

  return c.json({
    success: true,
    data: {
      claim_id: id,
      status: 'pending',
      message: 'Claim submitted. You will receive a verification email.',
    },
  }, 201);
});

/**
 * GET /api/claims/:id
 * Check claim status
 */
claims.get('/:id', async (c) => {
  const id = c.req.param('id');

  const claim = await c.env.DB.prepare(`
    SELECT c.*, s.name as shop_name
    FROM claims c
    JOIN shops s ON c.shop_id = s.id
    WHERE c.id = ?1
  `).bind(id).first();

  if (!claim) {
    return c.json({ success: false, error: 'Claim not found' }, 404);
  }

  return c.json({ success: true, data: claim });
});

export default claims;
