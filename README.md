# Find & Locate (หาของ)

Product Finder API — help people find products at nearby shops in Bangkok.

Built on Cloudflare Workers + Hono.js + D1.

## Architecture

| Component | Service |
|-----------|---------|
| API Runtime | Cloudflare Workers (Hono.js) |
| Database | D1 `superapp` (f3c8cd8d-e5d0-405a-9391-8ae0e859519f) |
| Cache | KV `superapp-cache` (63acb91f09e144aa845064dcb7fd2e47) |
| Sessions | KV `superapp-sessions` (70c337e3ddc148b5a0b55d58055ff252) |
| Media | R2 `superapp-media` |
| CI/CD | GitHub Actions |

## Quick Start

```bash
# Clone
git clone https://github.com/kasidit-wansudon/find-and-locate.git
cd find-and-locate

# Install
npm install

# Set up local secrets
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your keys

# Run locally
npm run dev
```

Visit `http://localhost:8787`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/search?q=กระเบื้อง` | Search products |
| GET | `/api/search/suggestions?q=กร` | Autocomplete |
| GET | `/api/search/trending` | Popular searches |
| GET | `/api/shops` | List shops |
| GET | `/api/shops/:id` | Shop detail + products |
| GET | `/api/categories` | All categories |
| POST | `/api/claims` | Claim shop ownership |

## Deploy

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | `697c43d79ac741e0928ec176b8286726` |
| `CLOUDFLARE_API_TOKEN` | Workers deploy token |

### Deploy via push

```bash
git push origin main
```

GitHub Actions auto-deploys to Cloudflare Workers.

### Run Migrations

Use the "Run D1 Migrations" workflow in GitHub Actions, or:

```bash
# Remote
npx wrangler d1 execute superapp --remote --file=./migrations/001_init.sql

# Seed data
npx wrangler d1 execute superapp --remote --file=./migrations/002_seed.sql
```

## Project Structure

```
find-and-locate/
├── .github/workflows/
│   ├── deploy.yml          # Auto-deploy on push
│   └── migrate.yml         # Manual D1 migrations
├── migrations/
│   ├── 001_init.sql        # Schema (tables + indexes)
│   └── 002_seed.sql        # Sample data
├── src/
│   ├── api/
│   │   ├── middleware/
│   │   │   ├── cors.ts     # CORS config
│   │   │   └── rateLimit.ts # Rate limiter (KV-backed)
│   │   ├── routes/
│   │   │   ├── search.ts   # Search + suggestions + trending
│   │   │   ├── shops.ts    # Shop CRUD + products
│   │   │   ├── categories.ts # Category listing
│   │   │   └── claims.ts   # Shop ownership claims
│   │   └── services/
│   │       └── search.ts   # Core search logic + caching
│   ├── types/
│   │   └── env.ts          # TypeScript types + Env bindings
│   ├── utils/
│   │   └── helpers.ts      # Haversine, pagination, etc.
│   └── index.ts            # Hono app entry point
├── wrangler.toml            # Cloudflare config
├── tsconfig.json
├── package.json
└── README.md
```

## License

MIT
