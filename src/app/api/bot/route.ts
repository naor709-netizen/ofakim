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

async function buildContext() {
  const [eventsRes, categoriesRes, infrastructuresRes] = await Promise.all([
    supabase.from("events").select("*, categories(name, department)").eq("status", "published").order("start_month"),
    supabase.from("categories").select("*"),
    supabase.from("infrastructures").select("*").eq("active", true),
  ]);

  type EventRow = { name: string; start_month: number; end_month: number; start_day: number | null; end_day: number | null; location: string | null; responsible: string | null; age_groups: string[] | null; categories?: { name: string; department: string } | null };
  const events = (eventsRes.data ?? []) as EventRow[];
  const eventsText = events.length > 0
    ? events.map(e => {
        const startLabel = MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(e.start_month)] ?? "";
        const endLabel   = e.end_month !== e.start_month ? `–${MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(e.end_month)] ?? ""}` : "";
        const dayPart    = e.start_day ? `${e.start_day} ` : "";
        return `• ${e.name} | ${e.categories?.name ?? "ללא תחום"} (${e.categories?.department === "education" ? "חינוך" : e.categories?.department === "youth" ? "נוער" : "—"}) | ${dayPart}${startLabel}${endLabel} | גיל: ${(e.age_groups ?? []).join(", ")}${e.location ? ` | מיקום: ${e.location}` : ""}${e.responsible ? ` | אחראי: ${e.responsible}` : ""}`;
      }).join("\n")
    : "(אין אירועים מתוכננים עדיין)";

  type InfraRow = { name: string; type: string; address: string | null; capacity: number | null; age_range: string | null; description: string | null };
  const infrastructures = (infrastructuresRes.data ?? []) as InfraRow[];
  const infraText = infrastructures.length > 0
    ? infrastructures.map(i =>
        `• ${i.name} (${i.type})${i.capacity ? ` | קיבולת: ${i.capacity}` : ""}${i.age_range ? ` | גילאים: ${i.age_range}` : ""}${i.description ? ` — ${i.description}` : ""}`
      ).join("\n")
    : "(לא הוזנו תשתיות עדיין)";

  const campusesText = CAMPUSES.map(c =>
    `• ${c.campus} ב${c.school}${c.instructor ? ` — מדריך: ${c.instructor}` : ""}`
  ).join("\n");

  return `אתה הבוט החכם של פורטל הגאנט השנתי של עיריית אופקים. אתה עוזר לעובדי מנהל החינוך ומחלקת הנוער לתכנן אירועים, להציע התאמת תשתיות, ולענות על שאלות לגבי הלוח.

## אירועי השנה (${events.length} אירועים)
${eventsText}

## מאגר תשתיות עירוני (${infrastructures.length} מקומות)
${infraText}

## קמפוסי לימוד וסדנאות (${CAMPUSES.length} קמפוסים פעילים)
${campusesText}

## הוראות תשובה
1. **שפה**: עברית עשירה ומשובחת. אוצר מילים גבוה. ידידותי וענייני.
2. **אורך**: תשובות קצרות וממוקדות (3-5 משפטים). פירוט רק אם נשאלת או אם המידע מורכב.
3. **המלצות תשתית**: כשממליצים על קמפוס/מקום — תמיד ציין את שם המדריך, בית הספר/מיקום, וקיבולת.
4. **התנגשויות**: כששואלים על תאריך — בדוק חפיפות חודשים בין האירועים.
5. **תאריכים**: השתמש בשמות חודשים בעברית. אם יש תאריך מדויק (יום+חודש) — ציין אותו.
6. **פילוחים**: כשמבקשים סטטיסטיקה — חשב מהרשימות לעיל, אל תמציא.
7. **ממציא? לא!**: אם אתה לא יודע — אמור "אין לי מידע על זה" במקום להמציא.`;
}

export async function POST(req: Request) {
  const { message, history } = await req.json() as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  };

  if (!client) {
    return Response.json({
      reply: "👋 הבוט עדיין לא פעיל — צריך להוסיף `ANTHROPIC_API_KEY` ל-.env.local כדי שאוכל לחשוב באמת.\n\nבינתיים אני כאן בתור הדגמה. שאל את המנהל להפעיל אותי!",
    });
  }

  try {
    const system = await buildContext();
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא צפויה";
    return Response.json({ reply: `אופס, הייתה לי שגיאה: ${message}` });
  }
}
