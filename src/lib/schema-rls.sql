-- ====================================
-- מדיניות אבטחה - הרצה ב-Supabase SQL Editor
-- ====================================
-- בשלב הראשוני: כל אחד יכול לקרוא וליצור אירועים.
-- בשלב מתקדם נחליף ב-Auth.

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE events     ENABLE ROW LEVEL SECURITY;

-- קטגוריות: קריאה לכולם
DROP POLICY IF EXISTS categories_read ON categories;
CREATE POLICY categories_read ON categories
  FOR SELECT USING (true);

-- אירועים: קריאה לכולם
DROP POLICY IF EXISTS events_read ON events;
CREATE POLICY events_read ON events
  FOR SELECT USING (true);

-- אירועים: יצירה לכולם (זמני - עד שיש Auth)
DROP POLICY IF EXISTS events_insert ON events;
CREATE POLICY events_insert ON events
  FOR INSERT WITH CHECK (true);

-- אירועים: עדכון ומחיקה לכולם (זמני)
DROP POLICY IF EXISTS events_update ON events;
CREATE POLICY events_update ON events
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS events_delete ON events;
CREATE POLICY events_delete ON events
  FOR DELETE USING (true);
