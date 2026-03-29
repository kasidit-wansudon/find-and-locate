-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login TEXT
);

-- Seed default admin (password: admin1234 — change in production!)
-- bcrypt hash of 'admin1234' rounds=10
INSERT OR IGNORE INTO admin_users (id, email, password_hash, name, role)
VALUES (
  'admin-0000-0000-0000-000000000001',
  'admin@oppo-oway.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'Super Admin',
  'super_admin'
);
