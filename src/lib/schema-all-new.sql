-- ============================================================
-- כל ה-SQL החדש (משלב יחיד) — הרץ ב-Supabase SQL Editor
-- ============================================================

-- 1. עמודות שנה לאירועים
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_year INT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_year   INT;
UPDATE events SET start_year = CASE WHEN start_month >= 9 THEN 2025 ELSE 2026 END WHERE start_year IS NULL;
UPDATE events SET end_year   = CASE WHEN end_month   >= 9 THEN 2025 ELSE 2026 END WHERE end_year IS NULL;

-- 2. מאגר תשתיות
CREATE TABLE IF NOT EXISTS infrastructures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  address TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  capacity INT,
  age_range TEXT,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE infrastructures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS infra_read   ON infrastructures;
DROP POLICY IF EXISTS infra_insert ON infrastructures;
DROP POLICY IF EXISTS infra_update ON infrastructures;
DROP POLICY IF EXISTS infra_delete ON infrastructures;
CREATE POLICY infra_read   ON infrastructures FOR SELECT USING (true);
CREATE POLICY infra_insert ON infrastructures FOR INSERT WITH CHECK (true);
CREATE POLICY infra_update ON infrastructures FOR UPDATE USING (true);
CREATE POLICY infra_delete ON infrastructures FOR DELETE USING (true);

INSERT INTO infrastructures (name, type, address, capacity, description) VALUES
  ('היכל התרבות אופקים',   'אולם',        'רחוב הרצל 15',  600, 'אולם מופעים מרכזי'),
  ('בית הקולנוע',          'אולם',        'מרכז העיר',     300, 'אולמות סרטים ומופעים'),
  ('המגנט',                'מועדון',      'מרכז',          150, 'מועדון נוער מאובזר'),
  ('הבית של שמי',          'מועדון',      'שכונת שיכון',   80,  'מקום מפגש לפעילויות נוער'),
  ('אולם ספורט גולומב',    'אולם ספורט',  'רחוב גולומב',   200, 'אולם ספורט גדול'),
  ('אולם ספורט חדש',       'אולם ספורט',  'מרכז הספורט',   250, 'אולם רב-תכליתי')
ON CONFLICT DO NOTHING;

-- 3. היסטוריית שינויים
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  event_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  department TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_read   ON audit_log;
DROP POLICY IF EXISTS audit_insert ON audit_log;
CREATE POLICY audit_read   ON audit_log FOR SELECT USING (true);
CREATE POLICY audit_insert ON audit_log FOR INSERT WITH CHECK (true);

-- 4. משתמשים (עובדי הרשות)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  department TEXT CHECK (department IN ('education', 'youth')),
  active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(LOWER(email));
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_read   ON users;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;
DROP POLICY IF EXISTS users_delete ON users;
CREATE POLICY users_read   ON users FOR SELECT USING (true);
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (true);
CREATE POLICY users_update ON users FOR UPDATE USING (true);
CREATE POLICY users_delete ON users FOR DELETE USING (true);

-- 5. משתמשים ראשוניים (חובה - מנהל-העל!)
INSERT INTO users (email, full_name, role, department) VALUES
  ('naor709@gmail.com',           'נאור - מנהל-על',        'admin', NULL),
  ('education1@ofakim.muni.il',   'דוגמה - עובד חינוך',    'staff', 'education'),
  ('youth1@ofakim.muni.il',       'דוגמה - עובד נוער',     'staff', 'youth')
ON CONFLICT (email) DO NOTHING;
