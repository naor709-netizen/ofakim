-- ====================================
-- פורטל גאנט אופקים - סכמת בסיס נתונים
-- הרץ את זה ב-Supabase → SQL Editor
-- ====================================

-- תחומים
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('education', 'youth')),
  color TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- אירועים
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) NOT NULL,
  start_month INT NOT NULL CHECK (start_month BETWEEN 1 AND 12),
  end_month INT NOT NULL CHECK (end_month BETWEEN 1 AND 12),
  start_day INT,
  end_day INT,
  location TEXT,
  age_groups TEXT[] NOT NULL DEFAULT '{}',
  responsible TEXT,
  registration_link TEXT,
  notes TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- עדכון אוטומטי של updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ====================================
-- נתוני התחומים (seed)
-- ====================================
INSERT INTO categories (name, department, color, display_order) VALUES
  ('גיל הרך',          'education', '#1D9E75', 1),
  ('חינוך יסודי',      'education', '#185FA5', 2),
  ('על-יסודי',          'education', '#7F77DD', 3),
  ('קייטנות',           'education', '#D4537E', 4),
  ('חינוך חרדי',        'education', '#888780', 5),
  ('אירועים כלליים',   'education', '#5F5E5A', 6),
  ('הכשרות',            'education', '#BA7517', 7),
  ('ימי הפוגה',         'education', '#E8B454', 8),
  ('תנועת חלום',        'youth',     '#D85A30', 1),
  ('מעורבות חברתית',   'youth',     '#BA7517', 2),
  ('שירות משמעותי',    'youth',     '#1D9E75', 3),
  ('תנועות נוער',       'youth',     '#639922', 4),
  ('מכינות ושנת שירות','youth',     '#7F77DD', 5),
  ('אירועי הפוגה',      'youth',     '#D4537E', 6),
  ('אירועים כלליים',   'youth',     '#885511', 7)
ON CONFLICT DO NOTHING;

-- ====================================
-- הפעלת Realtime על טבלת אירועים
-- ====================================
ALTER PUBLICATION supabase_realtime ADD TABLE events;
