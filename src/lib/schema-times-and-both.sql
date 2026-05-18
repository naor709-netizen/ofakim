-- ====================================
-- מיגרציה: שעות לאירוע + תחום משותף לשתי המחלקות
-- הרץ ב-Supabase → SQL Editor
-- ====================================

-- 1. שעות התחלה וסיום לאירוע (אופציונלי)
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time   TIME;

-- 2. אפשר לתחום להיות גם 'both' (שתי המחלקות)
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_department_check;
ALTER TABLE categories
  ADD CONSTRAINT categories_department_check
  CHECK (department IN ('education', 'youth', 'both'));
