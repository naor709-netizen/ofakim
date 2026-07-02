import Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CAMPUSES } from "@/lib/campuses";
import { HOLIDAYS, MONTHS_HE, SCHOOL_YEAR_MONTHS } from "@/lib/data";

export const dynamic = "force-dynamic";

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _supabase;
}

let _anthropic: Anthropic | null | undefined;
function getAnthropic(): Anthropic | null {
  if (_anthropic === undefined) {
    _anthropic = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
  }
  return _anthropic;
}

type EventRow = {
  name: string; description: string | null;
  start_month: number; end_month: number;
  start_day: number | null; end_day: number | null;
  start_year?: number | null; end_year?: number | null;
  start_time?: string | null; end_time?: string | null;
  location: string | null; responsible: string | null;
  age_groups: string[] | null;
  categories?: { name: string; department: string } | null;
};

type InfraRow = {
  name: string; type: string; address: string | null;
  capacity: number | null; age_range: string | null; description: string | null;
};

async function loadData() {
  const sb = getSupabase();
  const [eventsRes, infrastructuresRes] = await Promise.all([
    sb.from("events").select("*, categories(name, department)").eq("status", "published").order("start_month"),
    sb.from("infrastructures").select("*").eq("active", true),
  ]);
  return {
    events: (eventsRes.data ?? []) as EventRow[],
    infrastructures: (infrastructuresRes.data ?? []) as InfraRow[],
  };
}

function monthLabel(m: number): string {
  return MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(m)] ?? "";
}

function formatEvent(e: EventRow): string {
  const startLabel = monthLabel(e.start_month);
  const endLabel   = e.end_month !== e.start_month ? `–${monthLabel(e.end_month)}` : "";
  const dayPart    = e.start_day ? `${e.start_day} ` : "";
  return `${e.name} (${dayPart}${startLabel}${endLabel}${e.location ? ` · ${e.location}` : ""})`;
}

// בוט פשוט שעונה על שאלות נפוצות בלי AI
function smartFallback(message: string, events: EventRow[], infrastructures: InfraRow[]): string {
  const m = message.toLowerCase();

  // ברכות ושיחת חולין — שהבוט ירגיש אנושי גם בלי AI
  if (/^(היי|הי|שלום|אהלן|בוקר טוב|ערב טוב|מה נשמע|מה קורה)[!?. ]*$/.test(m.trim())) {
    return "היי! 😊 כיף שבאת. אני כאן בשביל כל שאלה על אירועים, קמפוסים, חוגים ותשתיות באופקים. מה מעניין אותך?";
  }
  if (/תודה|מעולה|אחלה|סבבה/.test(m) && m.length < 25) {
    return "בשמחה! 💙 אם עולה לך עוד שאלה — אני כאן.";
  }

  // ספירת אירועים
  if (/כמה.*איר|מספר.*איר|סה.כ/.test(m)) {
    const edu   = events.filter(e => e.categories?.department === "education").length;
    const youth = events.filter(e => e.categories?.department === "youth").length;
    return `יש לנו ${events.length} אירועים מתוכננים השנה 🎉\n• ${edu} של מנהל החינוך\n• ${youth} של מחלקת הנוער\n\nרוצה שאפרט על חודש מסוים?`;
  }

  // אירועים בחודש מסוים
  const monthMatch = MONTHS_HE.find(month => message.includes(month));
  if (monthMatch) {
    const monthIdx = MONTHS_HE.indexOf(monthMatch);
    const monthNum = SCHOOL_YEAR_MONTHS[monthIdx];
    const evs = events.filter(e => e.start_month <= monthNum && e.end_month >= monthNum);
    if (evs.length === 0) return `ב${monthMatch} היומן פנוי בינתיים 🙂 שווה לבדוק שוב בהמשך — או לשאול אותי על חודש אחר!`;
    return `ב${monthMatch} קורים ${evs.length} דברים שווים:\n${evs.map(e => `• ${formatEvent(e)}`).join("\n")}`;
  }

  // המלצות קמפוסים
  if (/נגרות|נגר/.test(m)) {
    return `🪚 בשביל נגרות יש לנו את קמפוס "נגרים צעירים" בבית ספר גוונים, בהדרכת מיכאל — מתאים לכיתות ה'-ח'. שווה להציץ!`;
  }
  if (/מוסיק|נגינ/.test(m)) {
    return `🎵 חובבי מוזיקה? קמפוס "מוסיקה" בבית ספר הגבעה עם טל מלכה מחכה לכם!`;
  }
  if (/תיאטרון|הצג/.test(m)) {
    return `🎭 לתיאטרון — קמפוס "תיאטרון" בגוונים עם המדריך ניל דוד. מצוין לחטיבה ותיכון!`;
  }
  if (/ספורט|כדור/.test(m)) {
    const sports = CAMPUSES.filter(c => /ספורט|כדור|אתל|נינ|הופ|מגע/i.test(c.campus));
    if (sports.length > 0) {
      return `⚽ אוהבים לזוז? הנה קמפוסי הספורט שלנו:\n${sports.slice(0, 5).map(c => `• ${c.campus} ב${c.school}${c.instructor ? ` עם ${c.instructor}` : ""}`).join("\n")}`;
    }
  }
  if (/אומנו|יצירה|אמנו/.test(m)) {
    return `🎨 ליצירתיים שבינינו:\n• אומנות בגוונים\n• יזמות וחדשנות באשלים עם אשר\n• מלאכות קדומות בבן גוריון עם מיטל בוטו`;
  }

  // המלצות לפי גיל
  if (/גן|גנים|רך/.test(m)) {
    const earlyEvents = events.filter(e => e.age_groups?.some(g => /גן|0-3|3-6|0-6/.test(g)));
    if (earlyEvents.length > 0) {
      return `👶 לקטנטנים שלנו:\n${earlyEvents.slice(0, 5).map(e => `• ${formatEvent(e)}`).join("\n")}`;
    }
  }
  if (/יסוד|א-ו|א'-ו/.test(m)) {
    const elemEvents = events.filter(e => e.age_groups?.some(g => /א-ו|א-ח|כיתות/.test(g)));
    if (elemEvents.length > 0) {
      return `📚 לילדי היסודי:\n${elemEvents.slice(0, 5).map(e => `• ${formatEvent(e)}`).join("\n")}`;
    }
  }
  if (/ז-יב|חטיב|תיכון|על.?יסוד/.test(m)) {
    const secEvents = events.filter(e => e.age_groups?.some(g => /ז-ט|י-יב|ז-יב|תיכון/.test(g)));
    if (secEvents.length > 0) {
      return `🎓 לנוער שלנו:\n${secEvents.slice(0, 5).map(e => `• ${formatEvent(e)}`).join("\n")}`;
    }
  }

  // מקומות / תשתיות
  if (/איפה|מקום|אולם|קיב/.test(m)) {
    if (infrastructures.length === 0) return "עדיין לא הוזנו תשתיות במערכת — אבל זה בדרך! 🙂";
    return `🏛 הנה המקומות הזמינים בעיר:\n${infrastructures.slice(0, 6).map(i => `• ${i.name}${i.capacity ? ` (עד ${i.capacity} אנשים)` : ""}${i.address ? ` · ${i.address}` : ""}`).join("\n")}`;
  }

  // חודש עמוס
  if (/עמוס|הכי.*איר|מתי.*עמוס/.test(m)) {
    const counts = SCHOOL_YEAR_MONTHS.map(mn => ({
      month: mn,
      label: monthLabel(mn),
      count: events.filter(e => e.start_month <= mn && e.end_month >= mn).length,
    }));
    counts.sort((a, b) => b.count - a.count);
    return `📊 החודשים הכי שוקקים השנה:\n${counts.slice(0, 3).map((c, i) => `${i + 1}. ${c.label} – ${c.count} אירועים`).join("\n")}`;
  }

  // ברירת מחדל
  return `אשמח לעזור! 😊 הנה כמה דברים שאפשר לשאול אותי:
• "כמה אירועים יש השנה?"
• "מה קורה בחודש מאי?"
• "תמליץ על קמפוס לנגרות / מוזיקה / תיאטרון"
• "אילו אירועים יש לכיתות ז'?"
• "איזה חודש הכי עמוס?"
• "איפה אפשר לעשות אירוע ל-200 אנשים?"

מה מסקרן אותך?`;
}

function buildSystemPrompt(events: EventRow[], infrastructures: InfraRow[]) {
  const eventsText = events.length > 0
    ? events.map(e => {
        const startLabel = monthLabel(e.start_month);
        const endLabel   = e.end_month !== e.start_month ? `–${monthLabel(e.end_month)}` : "";
        const dayRange   = e.start_day
          ? `${e.start_day}${e.end_day && (e.end_day !== e.start_day || e.end_month !== e.start_month) ? `–${e.end_day}` : ""} `
          : "";
        const years = e.start_year ? ` (${e.start_year}${e.end_year && e.end_year !== e.start_year ? `–${e.end_year}` : ""})` : "";
        const time  = e.start_time ? ` | שעה: ${e.start_time.slice(0, 5)}${e.end_time ? `–${e.end_time.slice(0, 5)}` : ""}` : "";
        return `• ${e.name} | ${e.categories?.name ?? "—"} (${e.categories?.department === "education" ? "חינוך" : "נוער"}) | ${dayRange}${startLabel}${endLabel}${years}${time} | גיל: ${(e.age_groups ?? []).join(", ") || "—"}${e.location ? ` | מיקום: ${e.location}` : ""}${e.responsible ? ` | אחראי: ${e.responsible}` : ""}${e.description ? ` | תיאור: ${e.description.slice(0, 200)}` : ""}`;
      }).join("\n")
    : "(אין כרגע אירועים מפורסמים במערכת)";

  const infraText = infrastructures.length > 0
    ? infrastructures.map(i =>
        `• ${i.name} (${i.type})${i.capacity ? ` | עד ${i.capacity} אנשים` : ""}${i.address ? ` | ${i.address}` : ""}${i.age_range ? ` | גילאים: ${i.age_range}` : ""}${i.description ? ` — ${i.description}` : ""}`
      ).join("\n")
    : "(אין תשתיות)";

  const campusesText = CAMPUSES.map(c =>
    `• ${c.campus} ב${c.school}${c.instructor ? ` — מדריך/ה: ${c.instructor}` : ""}`
  ).join("\n");

  const holidaysText = HOLIDAYS.map(h =>
    `• ${h.name} | ${h.day} ב${monthLabel(h.month)}${(h.duration ?? 1) > 1 ? ` (${h.duration} ימים)` : ""} | ${h.type === "vacation" ? "חופשה" : h.type === "memorial" ? "יום זיכרון" : "חג"}`
  ).join("\n");

  return `אתה "אופק" — העוזר הקהילתי החם של פורטל האירועים של עיריית אופקים. אתה מדבר עם הורים, תושבים ואנשי צוות חינוך ונוער.

# האופי שלך
- חם, קליל וידידותי — כמו שכן טוב שמכיר את כל מה שקורה בעיר ושמח לעזור.
- עברית טבעית ויומיומית, לא רשמית ולא רובוטית. מותר (ורצוי) אימוג'י אחד-שניים כשזה מתאים.
- אתה משוחח בחופשיות: עונה על שאלות המשך, זוכר את ההקשר של השיחה, שואל שאלה מכוונת כשמשהו לא ברור, ומציע כיוון נוסף כשזה עוזר ("אגב, אם זה מעניין אתכם — יש גם...").
- מתאים את עצמך למי שמולך: להורה שמחפש חוג לילד תיתן המלצה אישית; לרכז שמתכנן אירוע תעזור עם מקומות ותאריכים.

# איך אתה עונה
- תשובות קצרות וזורמות כברירת מחדל (2-4 משפטים). כשמבקשים פירוט או רשימה — תפרט בכיף, עם רשימת נקודות מסודרת.
- כל עובדה שאתה מוסר (תאריך, מקום, מדריך, גיל) חייבת להגיע מהנתונים שלמטה. אל תמציא אירועים, תאריכים או פרטים.
- כשאין לך את המידע — תגיד את זה בחום ובכנות, והצע את הקרוב ביותר שכן יש ("אין לי תאריך מדויק לזה, אבל אני יודע ש... אולי שווה לבדוק גם...").
- אתה חופשי להצליב ולנתח את הנתונים: להשוות חודשים, לסכם, להמליץ לפי גיל ותחום עניין, לחשב כמה זמן נשאר עד אירוע.
- שאלות כלליות שלא קשורות לנתונים (למשל "מה זה גאנט?") — ענה בקצרה ובחזרה לנושא בעדינות.

# אירועי השנה (חודשי שנת הלימודים: ספטמבר–אוגוסט)
${eventsText}

# חגים וחופשות בשנת הלימודים
${holidaysText}

# תשתיות ומקומות בעיר
${infraText}

# קמפוסי לימוד וחוגים (תוכניות העשרה בבתי הספר)
${campusesText}`;
}

const MAX_HISTORY = 12;
const MAX_MESSAGE_LEN = 2000;

export async function POST(req: Request) {
  const { message, history } = await req.json() as {
    message: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };

  const userMessage = (message ?? "").slice(0, MAX_MESSAGE_LEN).trim();
  if (!userMessage) {
    return new Response("לא קיבלתי שאלה 🙂 מה תרצו לדעת?", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const { events, infrastructures } = await loadData();
  const client = getAnthropic();

  const textResponse = (text: string) =>
    new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });

  // אם אין מפתח Anthropic - השתמש בבוט הפנימי
  if (!client) {
    return textResponse(smartFallback(userMessage, events, infrastructures));
  }

  const trimmedHistory = (history ?? [])
    .filter(h => (h.role === "user" || h.role === "assistant") && h.content?.trim())
    .slice(-MAX_HISTORY)
    .map(h => ({ role: h.role, content: h.content.slice(0, MAX_MESSAGE_LEN) }));

  const now = new Date();
  const todayText = `היום: ${now.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}. השתמש בזה כדי לענות על "מה קרוב?", "מה החודש?" וכדומה.`;

  // סטרימינג — התשובה מתחילה להופיע אצל המשתמש מיד
  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      output_config: { effort: "low" },
      system: [
        {
          type: "text",
          text: buildSystemPrompt(events, infrastructures),
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: todayText },
      ],
      messages: [
        ...trimmedHistory,
        { role: "user" as const, content: userMessage },
      ],
    });

    const encoder = new TextEncoder();
    let sentAnything = false;
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              sentAnything = true;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch {
          // אם Claude נפל לפני שיצא טקסט — עונים עם הבוט הפנימי
          if (!sentAnything) {
            controller.enqueue(encoder.encode(smartFallback(userMessage, events, infrastructures)));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    // אם Claude נכשל — fallback פנימי
    return textResponse(smartFallback(userMessage, events, infrastructures));
  }
}
