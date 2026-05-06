-- ====================================
-- מערכת התחברות עובדים - הרץ ב-Supabase SQL Editor
-- ====================================

-- טבלת משתמשים (עובדים)
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

-- אינדקס לחיפוש מהיר לפי מייל
CREATE INDEX IF NOT EXISTS users_email_idx ON users(LOWER(email));

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_read   ON users;
DROP POLICY IF EXISTS users_update ON users;

-- כל אחד יכול לקרוא את טבלת המשתמשים (כדי לזהות את עצמו)
CREATE POLICY users_read ON users FOR SELECT USING (true);

-- עדכון מותר (מעדכן last_login)
CREATE POLICY users_update ON users FOR UPDATE USING (true);

-- ====================================
-- הוספת המנהל-העל הראשי (החליפו את האימייל!)
-- ====================================
INSERT INTO users (email, full_name, role, department) VALUES
  ('admin@ofakim.muni.il', 'מנהל-על', 'admin', NULL)
ON CONFLICT (email) DO NOTHING;

-- ====================================
-- דוגמאות עובדים (אופציונלי - אפשר להוסיף מהממשק אחר כך)
-- ====================================
INSERT INTO users (email, full_name, role, department) VALUES
  ('education1@ofakim.muni.il', 'דוגמה - עובד חינוך',  'staff', 'education'),
  ('youth1@ofakim.muni.il',     'דוגמה - עובד נוער',  'staff', 'youth')
ON CONFLICT (email) DO NOTHING;
