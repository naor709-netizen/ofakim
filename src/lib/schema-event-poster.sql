-- ====================================
-- מיגרציה: פוסטר לאירוע (image_url) + Storage bucket ציבורי
-- הרץ ב-Supabase → SQL Editor
-- ====================================

-- 1. עמודת פוסטר לאירוע
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Storage bucket ציבורי לפוסטרים
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-posters', 'event-posters', true)
ON CONFLICT (id) DO NOTHING;

-- 3. קריאה ציבורית לפוסטרים
DROP POLICY IF EXISTS event_posters_read ON storage.objects;
CREATE POLICY event_posters_read ON storage.objects
  FOR SELECT USING (bucket_id = 'event-posters');

-- 4. העלאה/עדכון/מחיקה — זמני, עד שיש Auth מלא (כמו שאר הטבלאות, ר' schema-rls.sql)
DROP POLICY IF EXISTS event_posters_insert ON storage.objects;
CREATE POLICY event_posters_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'event-posters');

DROP POLICY IF EXISTS event_posters_update ON storage.objects;
CREATE POLICY event_posters_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'event-posters');

DROP POLICY IF EXISTS event_posters_delete ON storage.objects;
CREATE POLICY event_posters_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'event-posters');
