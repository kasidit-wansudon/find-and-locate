// Cloudflare Worker bindings
export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;

  // R2 Bucket
  MEDIA: R2Bucket;

  // Environment Variables
  APP_NAME: string;
  APP_VERSION: string;
  DEFAULT_CITY: string;
  MAX_SEARCH_RADIUS_KM: string;
  RESULTS_PER_PAGE: string;

  // Secrets (set via wrangler secret put)
  GOOGLE_PLACES_API_KEY?: string;
  GOOGLE_MAPS_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  JWT_SECRET?: string;
}

// ─── Database Models ───

export interface Category {
  id: string;
  name: string;
  name_en: string;
  icon: string | null;
  parent_id: string | null;
  created_at: string;
}

export interface Shop {
  id: string;
  google_place_id: string | null;
  name: string;
  name_en: string | null;
  description: string | null;
  address: string;
  district: string;
  province: string;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  line_id: string | null;
  google_rating: number | null;
  photo_url: string | null;
  opening_hours: string | null;
  is_verified: boolean;
  verified_email: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  name_normalized: string | null;
  category_id: string;
  brand: string | null;
  description: string | null;
  image_url: string | null;
  tags: string | null;
  created_at: string;
}

export interface Inventory {
  id: string;
  shop_id: string;
  product_id: string;
  price: number | null;
  price_unit: string;
  in_stock: boolean;
  stock_quantity: number | null;
  last_confirmed: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Claim {
  id: string;
  shop_id: string;
  email: string;
  google_token: string | null;
  status: string;
  claimed_at: string;
  verified_at: string | null;
}

export interface SearchLog {
  id: number;
  query: string;
  category_id: number | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  results_count: number;
  user_ip: string | null;
  user_agent: string | null;
  created_at: string;
}

// ─── API Response Types ───

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page: number;
    per_page: number;
    total: number;
  };
}

export interface SearchResult {
  shop: Shop;
  product: Product;
  inventory: Inventory;
  distance_km: number;
}

export interface SearchParams {
  q: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
  category?: string;
  district?: string;
  in_stock_only?: boolean;
  sort?: 'distance' | 'price' | 'rating';
  page?: number;
  per_page?: number;
}
