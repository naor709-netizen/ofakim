import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { CAMPUSES } from "@/lib/campuses";
import { MONTHS_HE, SCHOOL_YEAR_MONTHS } from "@/lib/data";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

type EventRow = {
  name: string; start_month: number; end_month: number;
  start_day: number | null; end_day: number | null;
  start_year?: number | null; end_year?: number | null;
  location: string | null; responsible: string | null;
  age_groups: string[] | null;
  categories?: { name: string; department: string } | null;
};

type InfraRow = {
  name: string; type: string; address: string | null;
  capacity: number | null; age_range: string | null; description: string | null;
};

async function loadData() {
  const [eventsRes, infrastructuresRes] = await Promise.all([
    supabase.from("events").select("*, categories(name, department)").eq("status", "published").order("start_month"),
    supabase.from("infrastructures").select("*").eq("active", true),
  ]);
  return {
    events: (eventsRes.data ?? []) as EventRow[],
    infrastructures: (infrastructuresRes.data ?? []) as InfraRow[],
  };
}

function formatEvent(e: EventRow): string {
  const startLabel = MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(e.start_month)] ?? "";
  const endLabel   = e.end_month !== e.start_month ? `–${MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(e.end_month)] ?? ""}` : "";
  const dayPart    = e.start_day ? `${e.start_day} ` : "";
  return `${e.name} (${dayPart}${startLabel}${endLabel}${e.location ? ` · ${e.location}` : ""})`;
}

// בוט פשוט שעונה על שאלות נפוצות בלי AI
function smartFallback(message: string, events: EventRow[], infrastructures: InfraRow[]): string {
  const m = message.toLowerCase();

  // ספירת אירועים
  if (/כמה.*איר|מספר.*איר|סה.כ/.test(m)) {
    const edu   = events.filter(e => e.categories?.department === "education").length;
    const youth = events.filter(e => e.categories?.department === "youth").length;
    return `יש כרגע ${events.length} אירועים מתוכננים השנה:\n• ${edu} במנהל החינוך\n• ${youth} במחלקת הנוער`;
  }

  // אירועים בחודש מסוים
  const monthMatch = MONTHS_HE.find(month => message.includes(month));
  if (monthMatch) {
    const monthIdx = MONTHS_HE.indexOf(monthMatch);
    const monthNum = SCHOOL_YEAR_MONTHS[monthIdx];
    const evs = events.filter(e => e.start_month <= monthNum && e.end_month >= monthNum);
    if (evs.length === 0) return `אין אירועים מתוכננים ב${monthMatch}.`;
    return `ב${monthMatch} מתוכננים ${evs.length} אירועים:\n${evs.map(e => `• ${formatEvent(e)}`).join("\n")}`;
  }

  // המלצות קמפוסים
  if (/נגרות|נגר/.test(m)) {
    return `🪚 לפעילות נגרות אני ממליץ על קמפוס "נגרים צעירים" בבית ספר גוונים, בהדרכת מיכאל. מתאים לכיתות ה'-ח'.`;
  }
  if (/מוסיק|נגינ/.test(m)) {
    return `🎵 לפעילות מוזיקה — קמפוס "מוסיקה" בבית ספר הגבעה, מורה: טל מלכה.`;
  }
  if (/תיאטרון|הצג/.test(m)) {
    return `🎭 לתיאטרון — קמפוס "תיאטרון" בגוונים עם המדריך ניל דוד. מצוין לחטיבה ותיכון.`;
  }
  if (/ספורט|כדור/.test(m)) {
    const sports = CAMPUSES.filter(c => /ספורט|כדור|אתל|נינ|הופ|מגע/i.test(c.campus));
    if (sports.length > 0) {
      return `⚽ קמפוסי ספורט פעילים:\n${sports.slice(0, 5).map(c => `• ${c.campus} ב${c.school}${c.instructor ? ` עם ${c.instructor}` : ""}`).join("\n")}`;
    }
  }
  if (/אומנו|יצירה|אמנו/.test(m)) {
    return `🎨 קמפוסי אומנות:\n• אומנות בגוונים\n• יזמות וחדשנות באשלים עם אשר\n• מלאכות קדומות בבן גוריון עם מיטל בוטו`;
  }

  // המלצות לפי גיל
  if (/גן|גנים|רך/.test(m)) {
    const earlyEvents = events.filter(e => e.age_groups?.some(g => /גן|0-3|3-6|0-6/.test(g)));
    if (earlyEvents.length > 0) {
      return `👶 אירועי גיל הרך:\n${earlyEvents.slice(0, 5).map(e => `• ${formatEvent(e)}`).join("\n")}`;
    }
  }
  if (/יסוד|א-ו|א'-ו/.test(m)) {
    const elemEvents = events.filter(e => e.age_groups?.some(g => /א-ו|א-ח|כיתות/.test(g)));
    if (elemEvents.length > 0) {
      return `📚 אירועי יסודי:\n${elemEvents.slice(0, 5).map(e => `• ${formatEvent(e)}`).join("\n")}`;
    }
  }
  if (/ז-יב|חטיב|תיכון|על.?יסוד/.test(m)) {
    const secEvents = events.filter(e => e.age_groups?.some(g => /ז-ט|י-יב|ז-יב|תיכון/.test(g)));
    if (secEvents.length > 0) {
      return `🎓 אירועי על-יסודי:\n${secEvents.slice(0, 5).map(e => `• ${formatEvent(e)}`).join("\n")}`;
    }
  }

  // מקומות / תשתיות
  if (/איפה|מקום|אולם|קיב/.test(m)) {
    if (infrastructures.length === 0) return "עדיין לא הוזנו תשתיות במערכת.";
    return `🏛 תשתיות זמינות בעיר:\n${infrastructures.slice(0, 6).map(i => `• ${i.name}${i.capacity ? ` (עד ${i.capacity} אנשים)` : ""}${i.address ? ` · ${i.address}` : ""}`).join("\n")}`;
  }

  // חודש עמוס
  if (/עמוס|הכי.*איר|מתי.*עמוס/.test(m)) {
    const counts = SCHOOL_YEAR_MONTHS.map(m => ({
      month: m,
      label: MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(m)],
      count: events.filter(e => e.start_month <= m && e.end_month >= m).length,
    }));
    counts.sort((a, b) => b.count - a.count);
    return `📊 החודשים העמוסים ביותר השנה:\n${counts.slice(0, 3).map((c, i) => `${i + 1}. ${c.label} – ${c.count} אירועים`).join("\n")}`;
  }

  // ברירת מחדל
  return `אני יכול לענות לך על שאלות כמו:
• "כמה אירועים יש השנה?"
• "מה יש בחודש מאי?"
• "תמליץ על קמפוס לנגרות / מוסיקה / תיאטרון"
• "אילו אירועים יש לכיתות ז'?"
• "איזה חודש הכי עמוס?"
• "איפה אפשר לעשות אירוע ל-200 אנשים?"

נסה לשאול שאלה כזאת! 😊`;
}

function buildSystemPrompt(events: EventRow[], infrastructures: InfraRow[]) {
  const eventsText = events.length > 0
    ? events.map(e => {
        const startLabel = MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(e.start_month)] ?? "";
        const endLabel   = e.end_month !== e.start_month ? `–${MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(e.end_month)] ?? ""}` : "";
        const dayPart    = e.start_day ? `${e.start_day} ` : "";
        return `• ${e.name} | ${e.categories?.name ?? "—"} (${e.categories?.department === "education" ? "חינוך" : "נוער"}) | ${dayPart}${startLabel}${endLabel} | גיל: ${(e.age_groups ?? []).join(", ")}${e.location ? ` | מיקום: ${e.location}` : ""}`;
      }).join("\n")
    : "(אין אירועים מתוכננים)";

  const infraText = infrastructures.length > 0
    ? infrastructures.map(i =>
        `• ${i.name} (${i.type})${i.capacity ? ` | ${i.capacity} אנשים` : ""}${i.description ? ` — ${i.description}` : ""}`
      ).join("\n")
    : "(אין תשתיות)";

  const campusesText = CAMPUSES.map(c =>
    `• ${c.campus} ב${c.school}${c.instructor ? ` — ${c.instructor}` : ""}`
  ).join("\n");

  return `אתה הבוט החכם של פורטל הגאנט של עיריית אופקים.

## אירועי השנה
${eventsText}

## תשתיות
${infraText}

## קמפוסי לימוד (30)
${campusesText}

## הנחיות
- ענה בעברית עשירה וקצרה (3-5 משפטים).
- בהמלצות קמפוס: ציין מדריך ובית ספר.
- אם לא יודע — אמור "אין לי מידע".`;
}

export async function POST(req: Request) {
  const { message, history } = await req.json() as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  };

  const { events, infrastructures } = await loadData();

  // אם אין מפתח Anthropic - השתמש בבוט הפנימי
  if (!client) {
    const reply = smartFallback(message, events, infrastructures);
    return Response.json({ reply });
  }

  // אחרת — Claude מלא
  try {
    const system = buildSystemPrompt(events, infrastructures);
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 800,
      system,
      messages: [
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: message },
      ],
    });
    const reply = response.content[0].type === "text" ? response.content[0].text : "";
    return Response.json({ reply });
  } catch {
    // אם Claude נכשל — fallback פנימי
    const reply = smartFallback(message, events, infrastructures);
    return Response.json({ reply });
  }
}
