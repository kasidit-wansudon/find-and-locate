-- Find & Locate — Seed Data
-- Sample categories and test data for development

-- ─── Categories ───
INSERT OR IGNORE INTO categories (id, name, name_en, icon) VALUES
  ('cat-tiles', 'กระเบื้อง', 'Tiles', '🏗️'),
  ('cat-gundam', 'โมเดลกันดั้ม', 'Gundam Models', '🤖'),
  ('cat-autoparts', 'อะไหล่รถ', 'Auto Parts', '🔧'),
  ('cat-electronics', 'อิเล็กทรอนิกส์', 'Electronics', '⚡'),
  ('cat-hardware', 'วัสดุก่อสร้าง', 'Hardware', '🔨'),
  ('cat-furniture', 'เฟอร์นิเจอร์', 'Furniture', '🪑'),
  ('cat-pet', 'สัตว์เลี้ยง', 'Pet Supplies', '🐕'),
  ('cat-sports', 'กีฬา', 'Sports', '⚽');

-- ─── Sample Shops (Bangkok) ───
INSERT OR IGNORE INTO shops (id, name, name_en, address, district, lat, lng, phone, google_rating, source) VALUES
  ('shop-001', 'ร้านกระเบื้องสยาม', 'Siam Tiles', '123 ถ.พระราม 2', 'บางขุนเทียน', 13.6580, 100.4270, '02-123-4567', 4.2, 'seed'),
  ('shop-002', 'กันดั้มช็อป สยาม', 'Gundam Shop Siam', '456 สยามสแควร์ ซอย 3', 'ปทุมวัน', 13.7450, 100.5340, '02-234-5678', 4.8, 'seed'),
  ('shop-003', 'อะไหล่รถ เจริญกรุง', 'Charoen Krung Auto', '789 ถ.เจริญกรุง', 'บางรัก', 13.7270, 100.5140, '02-345-6789', 3.9, 'seed'),
  ('shop-004', 'โฮมโปร สาขาพระราม 9', 'HomePro Rama 9', '999 ถ.พระราม 9', 'ห้วยขวาง', 13.7570, 100.5650, '02-456-7890', 4.5, 'seed'),
  ('shop-005', 'ร้านช่างบ้าน ลาดพร้าว', 'Chang Baan Ladprao', '55 ถ.ลาดพร้าว', 'จตุจักร', 13.8050, 100.5690, '02-567-8901', 4.0, 'seed');

-- ─── Sample Products ───
INSERT OR IGNORE INTO products (id, name, name_normalized, category_id, brand, tags) VALUES
  ('prod-001', 'Floor Tile 60x60cm', 'กระเบื้องปูพื้น 60x60 ซม.', 'cat-tiles', 'COTTO', 'กระเบื้อง,พื้น,60x60,cotto'),
  ('prod-002', 'Wall Tile 30x60cm', 'กระเบื้องผนัง 30x60 ซม.', 'cat-tiles', 'COTTO', 'กระเบื้อง,ผนัง,30x60,cotto'),
  ('prod-003', 'RG 1/144 Freedom Gundam', 'RG 1/144 ฟรีดอมกันดั้ม', 'cat-gundam', 'Bandai', 'กันดั้ม,gundam,RG,freedom,bandai'),
  ('prod-004', 'MG 1/100 Wing Zero', 'MG 1/100 วิงซีโร่', 'cat-gundam', 'Bandai', 'กันดั้ม,gundam,MG,wing,zero,bandai'),
  ('prod-005', 'Brake Pad Toyota Vios', 'ผ้าเบรค โตโยต้า วีออส', 'cat-autoparts', 'Bendix', 'ผ้าเบรค,เบรค,toyota,vios,bendix'),
  ('prod-006', 'Engine Oil 5W-30 4L', 'น้ำมันเครื่อง 5W-30 4 ลิตร', 'cat-autoparts', 'Shell', 'น้ำมันเครื่อง,shell,5w30'),
  ('prod-007', 'LED Bulb 12W', 'หลอดไฟ LED 12W', 'cat-electronics', 'Philips', 'หลอดไฟ,LED,philips,12w'),
  ('prod-008', 'Cement 50kg', 'ปูนซีเมนต์ 50 กก.', 'cat-hardware', 'SCG', 'ปูน,ซีเมนต์,scg,ก่อสร้าง');

-- ─── Sample Inventory ───
INSERT OR IGNORE INTO inventory (id, shop_id, product_id, price, price_unit, in_stock, stock_quantity) VALUES
  ('inv-001', 'shop-001', 'prod-001', 290, 'ตร.ม.', 1, 500),
  ('inv-002', 'shop-001', 'prod-002', 350, 'ตร.ม.', 1, 300),
  ('inv-003', 'shop-002', 'prod-003', 890, 'ชิ้น', 1, 15),
  ('inv-004', 'shop-002', 'prod-004', 2490, 'ชิ้น', 1, 5),
  ('inv-005', 'shop-003', 'prod-005', 850, 'ชุด', 1, 20),
  ('inv-006', 'shop-003', 'prod-006', 1290, 'แกลลอน', 1, 50),
  ('inv-007', 'shop-004', 'prod-001', 310, 'ตร.ม.', 1, 1000),
  ('inv-008', 'shop-004', 'prod-007', 89, 'ชิ้น', 1, 200),
  ('inv-009', 'shop-004', 'prod-008', 165, 'ถุง', 1, 500),
  ('inv-010', 'shop-005', 'prod-007', 95, 'ชิ้น', 1, 80),
  ('inv-011', 'shop-005', 'prod-008', 170, 'ถุง', 0, 0);
