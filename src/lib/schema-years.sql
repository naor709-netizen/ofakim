-- ====================================
-- הוספת תמיכה בשנים — הרץ ב-Supabase SQL Editor
-- ====================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS start_year INT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_year   INT;

-- מילוי ערכים קיימים: שנתון תשפ"ו (ברירת מחדל)
UPDATE events SET start_year = CASE WHEN start_month >= 9 THEN 2025 ELSE 2026 END WHERE start_year IS NULL;
UPDATE events SET end_year   = CASE WHEN end_month   >= 9 THEN 2025 ELSE 2026 END WHERE end_year IS NULL;
