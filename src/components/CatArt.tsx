"use client";

// איור ייעודי לכל אזור בגאנט — מדליון SVG בצבע הקטגוריה
// ויזואלי בלבד: שם הקטגוריה לצד המדליון הוא נושא הזיהוי

const ART: Record<string, React.ReactNode> = {
  // נבט — גיל הרך
  early: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13C12 9 9 7 5 7c0 4 3 6 7 6Z" />
      <path d="M12 11c0-3.5 2.5-5.5 6.5-5.5 0 4-2.5 5.5-6.5 5.5Z" />
    </>
  ),
  // ספר פתוח — חינוך יסודי
  elementary: (
    <>
      <path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2Z" />
      <path d="M12 6v14" />
    </>
  ),
  // כובע בוגרים — על-יסודי
  secondary: (
    <>
      <path d="m12 5 10 4-10 4L2 9l10-4Z" />
      <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
      <path d="M22 9v5" />
    </>
  ),
  // אוהל — קייטנות
  camps: (
    <>
      <path d="M12 4 2 20h20L12 4Z" />
      <path d="m12 12 4 8H8l4-8Z" />
    </>
  ),
  // מגן דוד — חינוך חרדי
  haredi: (
    <>
      <path d="m12 3 7.8 13.5H4.2L12 3Z" />
      <path d="M12 21 4.2 7.5h15.6L12 21Z" />
    </>
  ),
  // לוח שנה עם כוכב — אירועים כלליים (חינוך)
  "edu-general": (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="m12 12.5 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3 1-2Z" />
    </>
  ),
  // לוח מטלות — הכשרות
  training: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4a3 3 0 0 1 6 0" />
      <path d="m8.5 13 2.5 2.5 4.5-5" />
    </>
  ),
  // שמשיית חוף — ימי הפוגה
  breaks: (
    <>
      <path d="M4 13a8.5 8.5 0 0 1 17 0H4Z" />
      <path d="M12.5 4.5V6" />
      <path d="M12.5 13v6a2 2 0 0 1-4 1" />
    </>
  ),
  // כוכב נופל — תנועת חלום
  dream: (
    <>
      <path d="m14 9 1.2 2.5 2.8.4-2 2 .5 2.7-2.5-1.3-2.5 1.3.5-2.7-2-2 2.8-.4L14 9Z" />
      <path d="m4 5 5 5M3 11l3 3M8 3l3 3" />
    </>
  ),
  // לב וקהילה — מעורבות חברתית
  social: (
    <>
      <path d="M12 7.5c1-2 4-2.2 5 0 .8 1.8-1.3 4-5 6.2C8.3 11.5 6.2 9.3 7 7.5c1-2.2 4-2 5 0Z" />
      <path d="M3 16c2.5 2.5 5 3.5 9 3.5s6.5-1 9-3.5" />
    </>
  ),
  // מדליה — שירות משמעותי
  meaningful: (
    <>
      <circle cx="12" cy="14.5" r="5.5" />
      <path d="M9.5 9.5 7.5 3.5M14.5 9.5l2-6M7.5 3.5h9" />
      <path d="m12 12.2.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3.9-1.8Z" />
    </>
  ),
  // מדורה — תנועות נוער
  movements: (
    <>
      <path d="M12 3c2 3 5 4.5 5 8a5 5 0 0 1-10 0c0-2 1-3.5 2.5-5 .3 1.2 1 2 2.5 2.5C11.5 6.8 11.5 5 12 3Z" />
      <path d="m5 21 14-3M19 21 5 18" />
    </>
  ),
  // מטרה וחץ — מכינות ושנת שירות
  prep: (
    <>
      <circle cx="11" cy="13" r="7" />
      <circle cx="11" cy="13" r="3" />
      <path d="M11 13 20 4M20 4h-4M20 4v4" />
    </>
  ),
  // בלונים — אירועי הפוגה
  recreation: (
    <>
      <circle cx="9" cy="7.5" r="4" />
      <circle cx="16.5" cy="6.5" r="3" />
      <path d="M9 11.5 12 21M16.5 9.5 12 21" />
    </>
  ),
  // מגפון — אירועים כלליים (נוער)
  "youth-general": (
    <>
      <path d="m4 10 14-5v14L4 14v-4Z" />
      <path d="M7 15v3.5a1.5 1.5 0 0 0 3 0" />
      <path d="M21 10v4" />
    </>
  ),
};

export function CatArt({ id, color, size = 30 }: { id: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, borderRadius: Math.round(size * 0.3), flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: `linear-gradient(135deg, ${color} 10%, color-mix(in srgb, ${color} 68%, #1E293B) 100%)`,
        boxShadow: `0 2px 6px ${color}55, inset 0 1px 0 rgba(255,255,255,0.28)`,
      }}
    >
      <svg
        width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} viewBox="0 0 24 24"
        fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      >
        {ART[id] ?? <circle cx="12" cy="12" r="7" />}
      </svg>
    </span>
  );
}
