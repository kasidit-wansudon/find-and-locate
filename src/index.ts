import { Hono } from 'hono';
import type { Env } from './types/env';
import { corsMiddleware } from './api/middleware/cors';
import { rateLimiter } from './api/middleware/rateLimit';
import searchRoutes from './api/routes/search';
import shopRoutes from './api/routes/shops';
import categoryRoutes from './api/routes/categories';
import claimRoutes from './api/routes/claims';

const app = new Hono<{ Bindings: Env }>();

// ─── Global Middleware ───
app.use('*', corsMiddleware);
app.use('/api/*', rateLimiter(60, 60_000));

// ─── Health Check ───
app.get('/', (c) => {
  return c.json({
    name: c.env.APP_NAME,
    version: c.env.APP_VERSION,
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// ─── API Routes ───
app.route('/api/search', searchRoutes);
app.route('/api/shops', shopRoutes);
app.route('/api/categories', categoryRoutes);
app.route('/api/claims', claimRoutes);

// ─── API Info ───
app.get('/api', (c) => {
  return c.json({
    name: 'Find & Locate API',
    version: c.env.APP_VERSION,
    endpoints: {
      search: {
        'GET /api/search': 'Search products across shops',
        'GET /api/search/suggestions': 'Autocomplete suggestions',
        'GET /api/search/trending': 'Trending searches',
      },
      shops: {
        'GET /api/shops': 'List shops',
        'GET /api/shops/:id': 'Shop detail with products',
        'GET /api/shops/:id/products': 'Products at a shop',
      },
      categories: {
        'GET /api/categories': 'List all categories',
        'GET /api/categories/:slug': 'Category detail',
      },
      claims: {
        'POST /api/claims': 'Claim shop ownership',
        'GET /api/claims/:id': 'Check claim status',
      },
    },
  });
});

// ─── 404 ───
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

// ─── Error Handler ───
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

export default app;
