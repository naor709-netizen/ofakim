# הגדרת התחברות תושבים — Magic Link

מדריך לפעולות הידניות הנדרשות ב-Supabase Dashboard.

## 1. הרצת ה-SQL

`Supabase Dashboard → SQL Editor → New query` — הדבק את התוכן של [`schema-parents.sql`](./schema-parents.sql) והרץ.

זה יוצר טבלת `parent_profiles` עם RLS — כל משתמש רואה רק את השורה שלו.

## 2. הפעלת Email Auth

`Authentication → Providers → Email` — ודא ש:
- **Enable Email provider** = ON
- **Confirm email** = ON (מומלץ — חוסם איפיק כפול)
- **Secure email change** = ON

## 3. Site URL ו-Redirect URLs

`Authentication → URL Configuration`:

- **Site URL:**
  - לפיתוח: `http://localhost:3000`
  - לפרודקשן: כתובת הדומיין שלך
- **Redirect URLs** (מאפשר את שניהם בו-זמנית):
  ```
  http://localhost:3000/auth/callback
  https://YOUR-DOMAIN/auth/callback
  ```

## 4. תבנית מייל (אופציונלי, מומלץ)

`Authentication → Email Templates → Magic Link` — אפשר לשנות לעברית:

```html
<h2>שלום!</h2>
<p>קישור הכניסה ללוח אופקים שלך מוכן:</p>
<p><a href="{{ .ConfirmationURL }}">לחץ כאן כדי להיכנס</a></p>
<p>הקישור תקף ל-60 דקות.</p>
```

## 5. בדיקה

1. הפעל את האפליקציה (`npm run dev`)
2. לך ל-`http://localhost:3000/luach/login`
3. הזן מייל אמיתי שלך
4. בדוק את תיבת המייל (גם spam) ולחץ על הקישור
5. אתה אמור להגיע ל-`/luach/onboarding` (אם לא קיים פרופיל) או `/luach/my` (אם קיים)

## הערות

- במצב חינם של Supabase יש מגבלה של ~3 מיילים בשעה לכל מייל. לפרודקשן צריך להגדיר SMTP חיצוני (Resend/SendGrid) ב-`Authentication → SMTP Settings`.
- הפרופיל המקומי ב-localStorage נשאר כ-cache בלבד. מקור האמת הוא הטבלה.
