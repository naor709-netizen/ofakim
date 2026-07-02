-- ====================================
-- מיגרציה: תחומים מרובים לאירוע
-- הרץ ב-Supabase → SQL Editor
-- ====================================

-- 1. עמודה חדשה: רשימת תחומים (UUIDs)
ALTER TABLE events ADD COLUMN IF NOT EXISTS category_ids UUID[] NOT NULL DEFAULT '{}';

-- 2. גיבוי: כל אירוע ישן שאין לו רשימה — לקבל את category_id הקיים כפריט יחיד
UPDATE events
SET category_ids = ARRAY[category_id]
WHERE category_ids = '{}'
   OR cardinality(category_ids) = 0;

-- 3. הערה: category_id נשאר (FK + תחום ראשי) לשמירה אחורה.
--    הקוד מבטיח ש-category_id תמיד = category_ids[1].
