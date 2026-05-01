-- ====================================
-- מאגר תשתיות + היסטוריית שינויים
-- הרץ ב-Supabase SQL Editor
-- ====================================

-- מאגר תשתיות
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

-- נתוני seed
INSERT INTO infrastructures (name, type, address, capacity, description) VALUES
  ('היכל התרבות אופקים',   'אולם',     'רחוב הרצל 15',    600, 'אולם מופעים מרכזי'),
  ('בית הקולנוע',          'אולם',     'מרכז העיר',       300, 'אולמות סרטים ומופעים'),
  ('המגנט',                'מועדון',   'מרכז',            150, 'מועדון נוער מאובזר'),
  ('הבית של שמי',          'מועדון',   'שכונת שיכון',     80,  'מקום מפגש לפעילויות נוער'),
  ('אולם ספורט גולומב',    'אולם ספורט', 'רחוב גולומב',   200, 'אולם ספורט גדול'),
  ('אולם ספורט חדש',       'אולם ספורט', 'מרכז הספורט',   250, 'אולם רב-תכליתי')
ON CONFLICT DO NOTHING;

-- היסטוריית שינויים
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
