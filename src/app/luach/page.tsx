"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { CATEGORIES, DEMO_EVENTS } from "@/lib/data";
import { readLocalDraft, getCurrentUser, fetchProfile } from "@/lib/parent";
import { supabase } from "@/lib/supabase";
import { getEvents, getCategories, type DbEvent, type DbCategory } from "@/lib/events";
import { addToGoogleCalendar, shareWhatsapp } from "@/lib/export";
import { TopBar } from "@/components/v3/TopBar";

// פלטה עירונית — ציאן/כחול
const ACCENT      = "#159BC4";
const ACCENT_DARK = "#1A5FA0";
const BG    = "#EEF4F8";
const INK   = "#15324A";
const INK2  = "#5B7186";
const INK3  = "#7B93A8";
const MUTED = "#9DB0BF";
const LINE  = "rgba(21,95,160,.08)";
const LINE2 = "rgba(21,95,160,.14)";
const CARD_SHADOW = "0 2px 12px rgba(21,95,160,.07)";

const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const MONTHS_SHORT = ["ינו׳","פבר׳","מרץ","אפר׳","מאי","יוני","יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"];
const DAY_NAMES = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];

type AgeFilterId = "all" | "family" | "early" | "elementary" | "secondary" | "youth";

const AGE_FILTERS: { id: AgeFilterId; label: string }[] = [
  { id: "all",        label: "הכל" },
  { id: "family",     label: "משפחות" },
  { id: "early",      label: "גיל הרך" },
  { id: "elementary", label: "יסודי" },
  { id: "secondary",  label: "על-יסודי" },
  { id: "youth",      label: "נוער" },
];

const AGE_FILTER_KEYWORDS: Record<Exclude<AgeFilterId, "all">, string[]> = {
  family:     ["משפחה", "משפחות"],
  early:      ["גן", "גיל הרך", "0-3", "3-6"],
  elementary: ["יסודי", "א-ו", "א'", "ב'", "ג'", "ד'", "ה'", "ו'"],
  secondary:  ["על-יסודי", "תיכון", "חטיבה", "ז-ט", "י-יב", "ז'", "ח'", "ט'", "י'", "יא", "יב"],
  youth:      ["נוער", "מדריכים", "תנועה"],
};

function matchesAgeFilter(ageGroups: string[], filter: AgeFilterId): boolean {
  if (filter === "all") return true;
  if (ageGroups.length === 0) return false;
  const keywords = AGE_FILTER_KEYWORDS[filter];
  return ageGroups.some(g => keywords.some(k => g.includes(k)));
}

// שנת הלימודים הפעילה (תשפ״ו) — נופלים אליה כשאין start_year/end_year
function defaultYearForMonth(month: number): number { return month >= 9 ? 2025 : 2026; }

function startOfDay(ts: number): number { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function addDays(ts: number, n: number): number { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); }
function weekStartOf(ts: number): number { const d = new Date(startOfDay(ts)); d.setDate(d.getDate() - d.getDay()); return d.getTime(); }
function dateTs(year: number, month: number, day: number): number { return new Date(year, month - 1, day).setHours(0, 0, 0, 0); }
function fmtFullDate(ts: number): string { const d = new Date(ts); return `${d.getDate()} ב${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

function weekRangeLabel(startTs: number, endTs: number): string {
  const a = new Date(startTs), b = new Date(endTs);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()}–${b.getDate()} ב${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
  }
  if (a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} ב${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ב${MONTHS_SHORT[b.getMonth()]} ${a.getFullYear()}`;
  }
  return `${a.getDate()} ב${MONTHS_SHORT[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ב${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`;
}

type WeekEvent = {
  id: string; name: string; description: string | null;
  catName: string; catColor: string;
  location: string | null; ageGroups: string[]; imageUrl: string | null;
  startTs: number; endTs: number;
  startTime: string | null; endTime: string | null;
  startYear: number; startMonth: number; startDay: number;
  endYear: number; endMonth: number; endDay: number;
};

const chipStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  fontSize: 12, fontWeight: 500, color: INK2,
  background: "#F2F6FA", padding: "4px 9px", borderRadius: 8,
};

const navBtnStyle: React.CSSProperties = {
  width: 42, height: 42, flexShrink: 0, borderRadius: 12,
  border: `1px solid ${LINE2}`, background: "#F4F8FB", color: ACCENT_DARK,
  fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center",
  justifyContent: "center", fontFamily: "inherit",
};

const waButtonStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 15px", fontSize: 13, fontWeight: 600, borderRadius: 10,
  border: "none", cursor: "pointer", fontFamily: "inherit",
  background: "#25D366", color: "#fff",
};

const gcalButtonStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 15px", fontSize: 13, fontWeight: 600, borderRadius: 10,
  border: `1px solid ${LINE2}`, cursor: "pointer", fontFamily: "inherit",
  background: "#fff", color: ACCENT_DARK,
};

const lineClamp2: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

export default function LuachPage() {
  const [ageFilter, setAgeFilter] = useState<AgeFilterId>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [dbEvents, setDbEvents] = useState<DbEvent[]>([]);
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [anchor, setAnchor] = useState<number>(() => weekStartOf(Date.now()));
  const [todayTs] = useState<number>(() => startOfDay(Date.now()));

  useEffect(() => {
    // Quick local check first for snappy UX, then verify against Supabase.
    setHasProfile(!!readLocalDraft());
    (async () => {
      const user = await getCurrentUser();
      setIsAuthed(!!user);
      if (!user) return;
      const p = await fetchProfile();
      setHasProfile(!!p);
    })();
    getEvents().then(setDbEvents);
    getCategories().then(setDbCategories);
    const channel = supabase
      .channel("luach-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        getEvents().then(setDbEvents);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // המרת אירועי DB (או DEMO_EVENTS כ-fallback) לפורמט תצוגה שבועית
  const allWeekEvents: WeekEvent[] = useMemo(() => {
    if (dbEvents.length > 0) {
      return dbEvents.map(e => {
        const ids = (e.category_ids && e.category_ids.length > 0)
          ? e.category_ids
          : (e.category_id ? [e.category_id] : []);
        const primaryCat = ids.map(id => dbCategories.find(c => c.id === id)).find((c): c is DbCategory => !!c)
          || (e.categories as DbCategory | undefined);
        const startYear = e.start_year ?? defaultYearForMonth(e.start_month);
        const endYear   = e.end_year   ?? defaultYearForMonth(e.end_month);
        const startDay  = e.start_day ?? 1;
        const endDay    = e.end_day   ?? startDay;
        return {
          id: e.id, name: e.name, description: e.description,
          catName: primaryCat?.name || "כללי", catColor: primaryCat?.color || "#888",
          location: e.location, ageGroups: e.age_groups || [], imageUrl: e.image_url,
          startTs: dateTs(startYear, e.start_month, startDay),
          endTs:   dateTs(endYear,   e.end_month,   endDay),
          startTime: e.start_time, endTime: e.end_time,
          startYear, startMonth: e.start_month, startDay,
          endYear,   endMonth: e.end_month,     endDay,
        };
      });
    }
    return DEMO_EVENTS.map(e => {
      const cat = CATEGORIES.find(c => c.id === e.categoryId);
      const startYear = defaultYearForMonth(e.startMonth);
      const endYear   = defaultYearForMonth(e.endMonth);
      const startDay  = e.startDay ?? 1;
      const endDay    = e.endDay   ?? startDay;
      return {
        id: e.id, name: e.name, description: null,
        catName: cat?.name || "כללי", catColor: cat?.color || "#888",
        location: e.location ?? null, ageGroups: e.ageGroups, imageUrl: null,
        startTs: dateTs(startYear, e.startMonth, startDay),
        endTs:   dateTs(endYear,   e.endMonth,   endDay),
        startTime: null, endTime: null,
        startYear, startMonth: e.startMonth, startDay,
        endYear,   endMonth: e.endMonth,     endDay,
      };
    });
  }, [dbEvents, dbCategories]);

  const filteredEvents = useMemo(
    () => allWeekEvents.filter(e => matchesAgeFilter(e.ageGroups, ageFilter)),
    [allWeekEvents, ageFilter]
  );

  const weekStart = anchor;
  const weekEnd = addDays(anchor, 6);

  const days = useMemo(() => {
    const result: { dayTs: number; isToday: boolean; events: WeekEvent[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const dayTs = addDays(weekStart, i);
      const dayEvents = filteredEvents
        .filter(e => dayTs >= e.startTs && dayTs <= e.endTs && dayTs === Math.max(e.startTs, weekStart))
        .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
      if (dayEvents.length === 0) continue;
      result.push({ dayTs, isToday: dayTs === todayTs, events: dayEvents });
    }
    return result;
  }, [weekStart, filteredEvents, todayTs]);

  const totalCount = days.reduce((sum, d) => sum + d.events.length, 0);
  const isEmpty = totalCount === 0;

  const nextEventStart = useMemo(() => {
    const future = filteredEvents.filter(e => e.startTs > weekEnd).map(e => e.startTs);
    return future.length > 0 ? Math.min(...future) : null;
  }, [filteredEvents, weekEnd]);

  function jumpToNext() {
    if (nextEventStart !== null) setAnchor(weekStartOf(nextEventStart));
  }

  function eventTimeLabel(e: WeekEvent): string {
    if (e.endTs > e.startTs) return weekRangeLabel(e.startTs, e.endTs);
    if (e.startTime) {
      const start = e.startTime.slice(0, 5);
      const end = e.endTime ? e.endTime.slice(0, 5) : null;
      return end && end !== start ? `${start}–${end}` : start;
    }
    return "כל היום";
  }

  function handleShare(e: WeekEvent) {
    const when = e.endTs > e.startTs
      ? `${fmtFullDate(e.startTs)} – ${fmtFullDate(e.endTs)}`
      : `${fmtFullDate(e.startTs)}${e.startTime ? ` · ${e.startTime.slice(0, 5)}` : ""}`;
    const text = `🗓️ ${e.name}\n📅 ${when}${e.location ? `\n📍 ${e.location}` : ""}${e.description ? `\n\n${e.description}` : ""}\n\nמתוך לוח האירועים של עיריית אופקים`;
    shareWhatsapp(text);
  }

  function handleGcal(e: WeekEvent) {
    addToGoogleCalendar({
      title: e.name,
      description: e.description ?? undefined,
      location: e.location ?? undefined,
      startYear: e.startYear, startMonth: e.startMonth, startDay: e.startDay,
      endYear: e.endYear, endMonth: e.endMonth, endDay: e.endDay,
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <TopBar
        variant="parent"
        title="לוח קהילתי"
        subtitle="LUACH · קהילתי · תשפ״ו"
        rightContent={
          <Link href={!isAuthed ? "/luach/login" : hasProfile ? "/luach/my" : "/luach/onboarding"} style={{
            background: "rgba(255,255,255,0.95)", color: "var(--parent-d)",
            padding: "7px 14px", borderRadius: 8,
            textDecoration: "none", fontSize: 12, fontWeight: 500,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {!isAuthed ? "🔐 כניסה / התאמה אישית" : hasProfile ? "👨‍👩‍👧 הלוח שלי" : "✨ התאמה אישית"}
          </Link>
        }
      />

      <div dir="rtl" style={{
        fontFamily: "var(--font, 'Heebo', system-ui, sans-serif)",
        padding: "18px 14px 40px", maxWidth: 820, margin: "0 auto",
        display: "flex", flexDirection: "column", gap: 14, color: INK,
      }}>

        {/* באנר אונבורדינג */}
        {!hasProfile && (
          <div style={{
            background: "linear-gradient(135deg, #FFF8EE 0%, #FAECE7 100%)",
            border: "0.5px solid #F5C57E", borderRadius: 16,
            padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12, flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>✨</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#7C4A0A" }}>
                  רוצים לוח אישי לפי הילדים שלכם?
                </div>
                <div style={{ fontSize: 11, color: "#92400E", marginTop: 2 }}>
                  סקר קצר של דקה — ונסנן לכם רק את מה שרלוונטי
                </div>
              </div>
            </div>
            <Link href={isAuthed ? "/luach/onboarding" : "/luach/login"} style={{
              padding: "6px 14px", fontSize: 12, fontWeight: 500,
              background: "#7C4A0A", color: "#fff",
              borderRadius: 10, textDecoration: "none",
              whiteSpace: "nowrap",
            }}>
              התאמה אישית ←
            </Link>
          </div>
        )}

        {/* ניווט שבועי + סינון */}
        <div style={{ background: "#fff", borderRadius: 18, padding: "14px 16px", boxShadow: CARD_SHADOW, border: `1px solid ${LINE}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <button onClick={() => setAnchor(a => addDays(a, -7))} aria-label="שבוע קודם" style={navBtnStyle}>›</button>
            <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: INK, letterSpacing: "-.2px" }}>
                {weekRangeLabel(weekStart, weekEnd)}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: ACCENT, marginTop: 1 }}>
                {totalCount === 0 ? "אין אירועים השבוע" : totalCount === 1 ? "אירוע אחד השבוע" : `${totalCount} אירועים השבוע`}
              </div>
            </div>
            <button onClick={() => setAnchor(a => addDays(a, 7))} aria-label="שבוע הבא" style={navBtnStyle}>‹</button>
          </div>

          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14, paddingTop: 13, borderTop: `1px solid ${LINE}` }}>
            {AGE_FILTERS.map(f => {
              const active = ageFilter === f.id;
              return (
                <button key={f.id} onClick={() => { setAgeFilter(f.id); setExpandedId(null); }} style={{
                  padding: "7px 14px", fontSize: 13, fontWeight: 600, borderRadius: 999,
                  cursor: "pointer", fontFamily: "inherit",
                  border: `1px solid ${active ? ACCENT : LINE2}`,
                  background: active ? ACCENT : "#fff",
                  color: active ? "#fff" : ACCENT_DARK,
                  transition: "all .15s",
                }}>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ימי השבוע עם אירועים */}
        {days.map(day => (
          <div key={day.dayTs} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: INK }}>
                  יום {DAY_NAMES[new Date(day.dayTs).getDay()]}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: INK3 }}>
                  {new Date(day.dayTs).getDate()} ב{MONTHS[new Date(day.dayTs).getMonth()]}
                </span>
              </div>
              {day.isToday && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: ACCENT, padding: "2px 9px", borderRadius: 999 }}>
                  היום
                </span>
              )}
              <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${LINE2}, transparent)` }} />
            </div>

            {day.events.map(ev => {
              const expanded = expandedId === ev.id;
              return (
                <div
                  key={ev.id}
                  onClick={() => setExpandedId(expanded ? null : ev.id)}
                  style={{
                    display: "flex", background: "#fff", borderRadius: 14, overflow: "hidden",
                    cursor: "pointer", boxShadow: CARD_SHADOW, border: `1px solid ${LINE}`,
                  }}
                >
                  <div style={{ width: 6, flexShrink: 0, background: ev.catColor }} />
                  <div style={{ flex: 1, minWidth: 0, padding: "14px 15px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        {ev.imageUrl && !expanded && (
                          <img src={ev.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                        )}
                        <div style={{ fontSize: 16, fontWeight: 700, color: INK, lineHeight: 1.3 }}>{ev.name}</div>
                      </div>
                      <div style={{
                        flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: ev.catColor,
                        background: ev.catColor + "1A", padding: "4px 10px", borderRadius: 9, whiteSpace: "nowrap",
                      }}>
                        {eventTimeLabel(ev)}
                      </div>
                    </div>

                    {ev.description && (
                      <div style={{ fontSize: 13.5, fontWeight: 400, color: INK2, lineHeight: 1.55, marginTop: 6, ...(expanded ? {} : lineClamp2) }}>
                        {ev.description}
                      </div>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 }}>
                      {ev.location && <span style={chipStyle}>📍 {ev.location}</span>}
                      {ev.ageGroups.length > 0 && <span style={chipStyle}>👥 {ev.ageGroups.join(", ")}</span>}
                      <span style={{ ...chipStyle, color: ev.catColor, background: ev.catColor + "1A", fontWeight: 600 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: ev.catColor, display: "inline-block" }} />
                        {ev.catName}
                      </span>
                    </div>

                    {!expanded && (
                      <div style={{ fontSize: 11.5, fontWeight: 500, color: MUTED, marginTop: 9 }}>
                        לחצו לפרטים ולהסבר מלא ‹
                      </div>
                    )}

                    {expanded && (
                      <div style={{ marginTop: 13, paddingTop: 13, borderTop: `1px solid ${LINE}`, display: "flex", flexDirection: "column", gap: 13 }}>
                        {ev.imageUrl && (
                          <img src={ev.imageUrl} alt={ev.name} style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 12, display: "block" }} />
                        )}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={e2 => { e2.stopPropagation(); handleShare(ev); }} style={waButtonStyle}>
                            📲 שיתוף בוואטסאפ
                          </button>
                          <button onClick={e2 => { e2.stopPropagation(); handleGcal(ev); }} style={gcalButtonStyle}>
                            📅 הוספה ליומן
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* מצב ריק */}
        {isEmpty && (
          <div style={{ background: "#fff", borderRadius: 18, padding: "40px 24px", textAlign: "center", boxShadow: CARD_SHADOW, border: `1px solid ${LINE}` }}>
            <div style={{ fontSize: 40 }}>🗓️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginTop: 10 }}>אין אירועים בשבוע זה</div>
            <div style={{ fontSize: 13.5, color: INK3, marginTop: 4 }}>
              {nextEventStart !== null ? "נסו לדפדף קדימה או לשנות סינון" : "בחרו סינון אחר כדי לראות אירועים"}
            </div>
            {nextEventStart !== null && (
              <button onClick={jumpToNext} style={{
                marginTop: 16, padding: "10px 20px", fontSize: 14, fontWeight: 600, borderRadius: 11,
                border: "none", cursor: "pointer", fontFamily: "inherit", background: ACCENT, color: "#fff",
              }}>
                לשבוע הבא עם אירועים ←
              </button>
            )}
          </div>
        )}

        {/* כותרת תחתונה */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 6, fontSize: 12, fontWeight: 500, color: "#93A6B7" }}>
          <span>לוח האירועים העירוני · אופקים · תשפ״ו</span>
          <span>·</span>
          <Link href="/" style={{ color: "#93A6B7", textDecoration: "none" }}>כניסת עובדים</Link>
        </div>
      </div>
    </div>
  );
}
