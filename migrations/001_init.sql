-- Find & Locate — Initial Schema
-- Database: superapp (D1)
-- Created: 2026-03-28

-- Categories (product types)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  name_en TEXT,
  icon TEXT,
  parent_id TEXT REFERENCES categories(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Shops (from Google Places + manual)
CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  google_place_id TEXT UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  province TEXT NOT NULL DEFAULT 'กรุงเทพ',
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  phone TEXT,
  website TEXT,
  line_id TEXT,
  google_rating REAL DEFAULT 0,
  photo_url TEXT,
  opening_hours TEXT, -- JSON
  is_verified BOOLEAN DEFAULT 0,
  verified_email TEXT,
  source TEXT DEFAULT 'google',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products (items that can be found)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  name_normalized TEXT,
  category_id TEXT REFERENCES categories(id),
  description TEXT,
  brand TEXT,
  model TEXT,
  image_url TEXT,
  tags TEXT, -- comma-separated for search
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inventory (which shop has which product)
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  shop_id TEXT NOT NULL REFERENCES shops(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  price REAL,
  price_unit TEXT DEFAULT 'ชิ้น',
  in_stock BOOLEAN DEFAULT 1,
  stock_quantity INTEGER,
  last_confirmed DATETIME,
  source TEXT DEFAULT 'auto',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, product_id)
);

-- Claims (shop ownership verification)
CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  shop_id TEXT NOT NULL REFERENCES shops(id),
  email TEXT NOT NULL,
  google_token TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected')),
  claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified_at DATETIME,
  UNIQUE(shop_id, email)
);

-- Search Logs (analytics)
CREATE TABLE IF NOT EXISTS search_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  category_id TEXT,
  district TEXT,
  lat REAL,
  lng REAL,
  results_count INTEGER DEFAULT 0,
  user_ip TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_shops_location ON shops(lat, lng);
CREATE INDEX IF NOT EXISTS idx_shops_district ON shops(district);
CREATE INDEX IF NOT EXISTS idx_shops_google_place ON shops(google_place_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products(tags);
CREATE INDEX IF NOT EXISTS idx_inventory_shop ON inventory(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory(in_stock);
CREATE INDEX IF NOT EXISTS idx_claims_shop ON claims(shop_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(query);
