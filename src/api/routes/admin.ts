import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { adminAuth, signJWT, verifyPassword, hashPassword, type AdminVariables } from '../middleware/adminAuth';

const admin = new Hono<{ Bindings: Env; Variables: AdminVariables }>();

// ─── POST /api/admin/login ───────────────────────────────────────────────────
admin.post('/login', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  if (!body.email || !body.password) {
    return c.json({ success: false, error: 'Email and password required' }, 400);
  }

  const user = await c.env.DB.prepare(
    'SELECT * FROM admin_users WHERE email = ?1'
  ).bind(body.email).first<any>();

  if (!user) {
    return c.json({ success: false, error: 'Invalid credentials' }, 401);
  }

  const valid = await verifyPassword(body.password, user.password_hash);
  if (!valid) {
    return c.json({ success: false, error: 'Invalid credentials' }, 401);
  }

  // Update last_login
  await c.env.DB.prepare(
    "UPDATE admin_users SET last_login = datetime('now') WHERE id = ?1"
  ).bind(user.id).run();

  const secret = c.env.JWT_SECRET || 'dev-secret-change-me';
  const token = await signJWT({ sub: user.id, email: user.email, role: user.role, name: user.name }, secret);

  return c.json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } } });
});

// ─── POST /api/admin/change-password ────────────────────────────────────────
admin.post('/change-password', adminAuth, async (c) => {
  const adminId = c.get('adminId');
  const body = await c.req.json<{ current_password: string; new_password: string }>();

  const user = await c.env.DB.prepare('SELECT * FROM admin_users WHERE id = ?1').bind(adminId).first<any>();
  if (!user) return c.json({ success: false, error: 'User not found' }, 404);

  const valid = await verifyPassword(body.current_password, user.password_hash);
  if (!valid) return c.json({ success: false, error: 'Wrong current password' }, 400);

  const newHash = await hashPassword(body.new_password);
  await c.env.DB.prepare('UPDATE admin_users SET password_hash = ?1 WHERE id = ?2')
    .bind(newHash, adminId).run();

  return c.json({ success: true });
});

// ─── GET /api/admin/me ───────────────────────────────────────────────────────
admin.get('/me', adminAuth, async (c) => {
  const adminId = c.get('adminId');
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, role, created_at, last_login FROM admin_users WHERE id = ?1'
  ).bind(adminId).first();
  return c.json({ success: true, data: user });
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
admin.get('/stats', adminAuth, async (c) => {
  const [shops, products, inventory, searches, pendingClaims] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM shops').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM products').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count, SUM(in_stock) as in_stock FROM inventory').first<{ count: number; in_stock: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM search_logs WHERE created_at >= datetime('now', '-7 days')").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM claims WHERE status = 'pending'").first<{ count: number }>(),
  ]);

  // Top 5 searches this week
  const { results: topSearches } = await c.env.DB.prepare(`
    SELECT query, COUNT(*) as count FROM search_logs
    WHERE created_at >= datetime('now', '-7 days') AND query != ''
    GROUP BY query ORDER BY count DESC LIMIT 5
  `).all();

  // Shops by district
  const { results: byDistrict } = await c.env.DB.prepare(`
    SELECT district, COUNT(*) as count FROM shops GROUP BY district ORDER BY count DESC LIMIT 8
  `).all();

  return c.json({
    success: true,
    data: {
      shops: shops?.count || 0,
      products: products?.count || 0,
      inventory_total: inventory?.count || 0,
      inventory_in_stock: inventory?.in_stock || 0,
      searches_7d: searches?.count || 0,
      pending_claims: pendingClaims?.count || 0,
      top_searches: topSearches || [],
      shops_by_district: byDistrict || [],
    },
  });
});

// ════════════════════════════════════════════════════════════════════
// SHOPS
// ════════════════════════════════════════════════════════════════════

admin.get('/shops', adminAuth, async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const perPage = parseInt(c.req.query('per_page') || '20');
  const q = c.req.query('q') || '';
  const offset = (page - 1) * perPage;

  let sql = 'SELECT * FROM shops';
  const vals: (string | number)[] = [];
  if (q) { sql += ' WHERE name LIKE ?1'; vals.push(`%${q}%`); }
  sql += ` ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}`;

  const stmt = vals.length ? c.env.DB.prepare(sql).bind(...vals) : c.env.DB.prepare(sql);
  const { results } = await stmt.all();

  const countRes = await c.env.DB.prepare(
    q ? `SELECT COUNT(*) as c FROM shops WHERE name LIKE ?1` : `SELECT COUNT(*) as c FROM shops`
  ).bind(...(q ? [`%${q}%`] : [])).first<{ c: number }>();

  return c.json({ success: true, data: results, meta: { page, per_page: perPage, total: countRes?.c || 0 } });
});

admin.post('/shops', adminAuth, async (c) => {
  const b = await c.req.json<any>();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO shops (id, name, name_en, address, district, province, lat, lng, phone, line_id, google_rating, photo_url, opening_hours, is_verified, source)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)
  `).bind(id, b.name, b.name_en||null, b.address||'', b.district||'', b.province||'กรุงเทพ',
    b.lat||0, b.lng||0, b.phone||null, b.line_id||null, b.google_rating||null,
    b.photo_url||null, b.opening_hours||null, b.is_verified?1:0, 'manual'
  ).run();
  const shop = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ?1').bind(id).first();
  return c.json({ success: true, data: shop }, 201);
});

admin.put('/shops/:id', adminAuth, async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json<any>();
  await c.env.DB.prepare(`
    UPDATE shops SET name=?1, name_en=?2, address=?3, district=?4, province=?5,
    lat=?6, lng=?7, phone=?8, line_id=?9, google_rating=?10, photo_url=?11,
    opening_hours=?12, is_verified=?13, updated_at=datetime('now') WHERE id=?14
  `).bind(b.name, b.name_en||null, b.address||'', b.district||'', b.province||'กรุงเทพ',
    b.lat||0, b.lng||0, b.phone||null, b.line_id||null, b.google_rating||null,
    b.photo_url||null, b.opening_hours||null, b.is_verified?1:0, id
  ).run();
  const shop = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ?1').bind(id).first();
  return c.json({ success: true, data: shop });
});

admin.delete('/shops/:id', adminAuth, async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM shops WHERE id = ?1').bind(id).run();
  return c.json({ success: true });
});

// ════════════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════════════

admin.get('/products', adminAuth, async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const perPage = parseInt(c.req.query('per_page') || '20');
  const q = c.req.query('q') || '';
  const offset = (page - 1) * perPage;

  let sql = `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id`;
  const vals: (string | number)[] = [];
  if (q) { sql += ' WHERE p.name LIKE ?1'; vals.push(`%${q}%`); }
  sql += ` ORDER BY p.created_at DESC LIMIT ${perPage} OFFSET ${offset}`;

  const stmt = vals.length ? c.env.DB.prepare(sql).bind(...vals) : c.env.DB.prepare(sql);
  const { results } = await stmt.all();

  const countRes = await c.env.DB.prepare(
    q ? `SELECT COUNT(*) as c FROM products WHERE name LIKE ?1` : `SELECT COUNT(*) as c FROM products`
  ).bind(...(q ? [`%${q}%`] : [])).first<{ c: number }>();

  return c.json({ success: true, data: results, meta: { page, per_page: perPage, total: countRes?.c || 0 } });
});

admin.post('/products', adminAuth, async (c) => {
  const b = await c.req.json<any>();
  const id = crypto.randomUUID();
  const normalized = (b.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
  await c.env.DB.prepare(`
    INSERT INTO products (id, name, name_normalized, category_id, brand, description, image_url, tags)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8)
  `).bind(id, b.name, normalized, b.category_id||null, b.brand||null, b.description||null, b.image_url||null, b.tags||null).run();
  const product = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?1').bind(id).first();
  return c.json({ success: true, data: product }, 201);
});

admin.put('/products/:id', adminAuth, async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json<any>();
  const normalized = (b.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
  await c.env.DB.prepare(`
    UPDATE products SET name=?1, name_normalized=?2, category_id=?3, brand=?4,
    description=?5, image_url=?6, tags=?7 WHERE id=?8
  `).bind(b.name, normalized, b.category_id||null, b.brand||null, b.description||null, b.image_url||null, b.tags||null, id).run();
  const product = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?1').bind(id).first();
  return c.json({ success: true, data: product });
});

admin.delete('/products/:id', adminAuth, async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM products WHERE id = ?1').bind(id).run();
  return c.json({ success: true });
});

// ─── Inventory for a product ─────────────────────────────────────────────────
admin.get('/products/:id/inventory', adminAuth, async (c) => {
  const id = c.req.param('id');
  const { results } = await c.env.DB.prepare(`
    SELECT i.*, s.name as shop_name FROM inventory i
    JOIN shops s ON i.shop_id = s.id WHERE i.product_id = ?1
  `).bind(id).all();
  return c.json({ success: true, data: results });
});

admin.put('/inventory/:id', adminAuth, async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json<any>();
  await c.env.DB.prepare(`
    UPDATE inventory SET price=?1, price_unit=?2, in_stock=?3, stock_quantity=?4,
    last_confirmed=datetime('now'), updated_at=datetime('now') WHERE id=?5
  `).bind(b.price||null, b.price_unit||'บาท', b.in_stock?1:0, b.stock_quantity||null, id).run();
  const inv = await c.env.DB.prepare('SELECT * FROM inventory WHERE id = ?1').bind(id).first();
  return c.json({ success: true, data: inv });
});

admin.post('/inventory', adminAuth, async (c) => {
  const b = await c.req.json<any>();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO inventory (id, shop_id, product_id, price, price_unit, in_stock, stock_quantity, source)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8)
  `).bind(id, b.shop_id, b.product_id, b.price||null, b.price_unit||'บาท', b.in_stock?1:0, b.stock_quantity||null, 'manual').run();
  return c.json({ success: true, data: { id } }, 201);
});

// ════════════════════════════════════════════════════════════════════
// CATEGORIES
// ════════════════════════════════════════════════════════════════════

admin.get('/categories', adminAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM categories ORDER BY name ASC'
  ).all();
  return c.json({ success: true, data: results });
});

admin.post('/categories', adminAuth, async (c) => {
  const b = await c.req.json<any>();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO categories (id, name, name_en, icon, parent_id) VALUES (?1,?2,?3,?4,?5)'
  ).bind(id, b.name, b.name_en||null, b.icon||null, b.parent_id||null).run();
  const cat = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?1').bind(id).first();
  return c.json({ success: true, data: cat }, 201);
});

admin.put('/categories/:id', adminAuth, async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json<any>();
  await c.env.DB.prepare(
    'UPDATE categories SET name=?1, name_en=?2, icon=?3, parent_id=?4 WHERE id=?5'
  ).bind(b.name, b.name_en||null, b.icon||null, b.parent_id||null, id).run();
  const cat = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?1').bind(id).first();
  return c.json({ success: true, data: cat });
});

admin.delete('/categories/:id', adminAuth, async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM categories WHERE id = ?1').bind(id).run();
  return c.json({ success: true });
});

// ════════════════════════════════════════════════════════════════════
// CLAIMS
// ════════════════════════════════════════════════════════════════════

admin.get('/claims', adminAuth, async (c) => {
  const status = c.req.query('status') || 'pending';
  const { results } = await c.env.DB.prepare(`
    SELECT cl.*, s.name as shop_name FROM claims cl
    JOIN shops s ON cl.shop_id = s.id
    WHERE cl.status = ?1 ORDER BY cl.claimed_at DESC
  `).bind(status).all();
  return c.json({ success: true, data: results });
});

admin.put('/claims/:id', adminAuth, async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json<{ status: 'approved' | 'rejected' }>();
  await c.env.DB.prepare(`
    UPDATE claims SET status=?1, verified_at=datetime('now') WHERE id=?2
  `).bind(b.status, id).run();

  if (b.status === 'approved') {
    const claim = await c.env.DB.prepare('SELECT * FROM claims WHERE id = ?1').bind(id).first<any>();
    if (claim) {
      await c.env.DB.prepare(
        "UPDATE shops SET is_verified=1, verified_email=?1, updated_at=datetime('now') WHERE id=?2"
      ).bind(claim.email, claim.shop_id).run();
    }
  }
  return c.json({ success: true });
});

export default admin;
