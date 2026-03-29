import { Context, Next } from 'hono';

/**
 * CORS middleware — allow frontend origins
 */
export async function corsMiddleware(c: Context, next: Next) {
  // Allow requests from Cloudflare Pages and localhost
  const allowedOrigins = [
    'https://find-and-locate.pages.dev',
    'https://find-and-locate-web.pages.dev',
    'https://find.kasidit-wans.com',
    'https://kasidit-wans.com',
    'https://hakhong.oppo-oway.com',
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  const origin = c.req.header('Origin') || '';
  const isAllowed = allowedOrigins.includes(origin)
    || origin.endsWith('.pages.dev')
    || origin.endsWith('.kasidit-wans.com');

  const allowOrigin = isAllowed ? origin : '*';

  c.header('Access-Control-Allow-Origin', allowOrigin);
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Max-Age', '86400');

  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  await next();
}
