"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  CATEGORIES, DEMO_EVENTS, MONTHS_HE, SCHOOL_YEAR_MONTHS,
  HOLIDAYS, type CategoryId, type Department,
} from "@/lib/data";
import { loadProfile } from "@/lib/parent";
import { supabase } from "@/lib/supabase";
import { getEvents, type DbEvent } from "@/lib/events";
import MonthlyView from "@/components/MonthlyView";
import { generateICal, downloadICal, addToGoogleCalendar, shareWhatsapp } from "@/lib/export";
import { useToast } from "@/components/Toast";
import { TopBar } from "@/components/v3/TopBar";

type AgeFilter = "all" | "0-6" | "elementary" | "secondary" | "families";
type DeptFilter = "all" | "education" | "youth";

const AGE_FILTERS: { id: AgeFilter; label: string }[] = [
  { id: "all",        label: "הכל" },
  { id: "education",  label: "מנהל החינוך" } as unknown as { id: AgeFilter; label: string },
  { id: "youth",      label: "מחלקת הנוער" } as unknown as { id: AgeFilter; label: string },
  { id: "0-6",        label: "גיל 0–6" },
  { id: "elementary", label: "כיתות א–ו" },
  { id: "secondary",  label: "כיתות ז–יב" },
  { id: "families",   label: "משפחות" },
];

// מיפוי חגים לפי חודש
function getHolidaysForMonth(month: number) {
  return HOLIDAYS.filter(h => h.month === month);
}

const iconBtnStyle: React.CSSProperties = {
  padding: "8px 14px", fontSize: 12, fontWeight: 500,
  borderRadius: 10, border: "0.5px solid var(--border)",
  background: "#fff", cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6,
  fontFamily: "inherit",
};

export default function LuachPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<DeptFilter>("all");
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("all");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [view, setView] = useState<"annual" | "monthly">("annual");
  const [hasProfile, setHasProfile] = useState(false);
  const [dbEvents, setDbEvents] = useState<DbEvent[]>([]);

  useEffect(() => {
    setHasProfile(!!loadProfile());
    getEvents().then(setDbEvents);
    const channel = supabase
      .channel("luach-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        getEvents().then(setDbEvents);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // המרת אירועי DB לפורמט תצוגה אחיד עם צבעי קטגוריות מקומיים (לפי שם)
  type ViewEv = {
    id: string; name: string;
    catName: string; catColor: string; catDept: "education" | "youth";
    startMonth: number; endMonth: number;
    startDay: number | null; endDay: number | null;
    location: string | null; responsible: string | null;
    ageGroups: string[]; status: string;
  };

  function localCatByName(name: string, dept?: string) {
    return CATEGORIES.find(c => c.name === name && (!dept || c.department === dept));
  }

  const allViewEvents: ViewEv[] = useMemo(() => {
    if (dbEvents.length > 0) {
      return dbEvents.map(e => {
        const dbDept = (e.categories?.department as "education" | "youth") || "education";
        const local = localCatByName(e.categories?.name || "", dbDept);
        return {
          id: e.id, name: e.name,
          catName: e.categories?.name || "ללא תחום",
          catColor: local?.color || "#888",
          catDept: dbDept,
          startMonth: e.start_month, endMonth: e.end_month,
          startDay: e.start_day, endDay: e.end_day,
          location: e.location, responsible: e.responsible,
          ageGroups: e.age_groups || [], status: e.status,
        };
      });
    }
    // fallback: DEMO_EVENTS
    return DEMO_EVENTS.map(e => {
      const cat = CATEGORIES.find(c => c.id === e.categoryId);
      return {
        id: e.id, name: e.name,
        catName: cat?.name || "ללא", catColor: cat?.color || "#888",
        catDept: cat?.department || "education",
        startMonth: e.startMonth, endMonth: e.endMonth,
        startDay: e.startDay ?? null, endDay: e.endDay ?? null,
        location: e.location ?? null, responsible: e.responsible ?? null,
        ageGroups: e.ageGroups, status: e.status,
      };
    });
  }, [dbEvents]);

  const educationCats = CATEGORIES.filter(c => c.department === "education");
  const youthCats     = CATEGORIES.filter(c => c.department === "youth");

  const visibleCategories = useMemo(() => {
    if (deptFilter === "education") return educationCats;
    if (deptFilter === "youth")     return youthCats;
    return [...educationCats, ...youthCats];
  }, [deptFilter]);

  const filteredEvents = useMemo(() => {
    return allViewEvents.filter(e => {
      if (e.status !== "published") return false;
      if (deptFilter !== "all" && e.catDept !== deptFilter) return false;
      if (search && !e.name.includes(search)) return false;
      return true;
    });
  }, [allViewEvents, deptFilter, search]);

  const selectedEventData = selectedEvent
    ? allViewEvents.find(e => e.id === selectedEvent)
    : null;

  // חישוב מיקום אירוע בגאנט (אחוזים)
  function eventStyle(startMonth: number, endMonth: number, color: string) {
    const startIdx = SCHOOL_YEAR_MONTHS.indexOf(startMonth);
    const endIdx   = SCHOOL_YEAR_MONTHS.indexOf(endMonth);
    if (startIdx < 0 || endIdx < 0) return null;
    const left  = (startIdx / 12) * 100;
    const width = ((endIdx - startIdx + 1) / 12) * 100;
    return { left: `${left}%`, width: `calc(${width}% - 4px)`, background: color };
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <TopBar
        variant="parent"
        title="לוח קהילתי"
        subtitle="LUACH · קהילתי · תשפ״ו"
        rightContent={
          <Link href={hasProfile ? "/luach/my" : "/luach/onboarding"} style={{
            background: "rgba(255,255,255,0.95)", color: "var(--parent-d)",
            padding: "7px 14px", borderRadius: 8,
            textDecoration: "none", fontSize: 12, fontWeight: 500,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {hasProfile ? "👨‍👩‍👧 הלוח שלי" : "✨ התאמה אישית"}
          </Link>
        }
      />
      <div style={{ padding: "20px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ background: "#fff", padding: 20, borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>

        {/* באנר אונבורדינג */}
        {!hasProfile && (
          <div style={{
            background: "linear-gradient(135deg, #FFF8EE 0%, #FAECE7 100%)",
            border: "0.5px solid #F5C57E", borderRadius: "var(--radius-md)",
            padding: "12px 16px", marginBottom: "1rem",
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
            <Link href="/luach/onboarding" style={{
              padding: "6px 14px", fontSize: 12, fontWeight: 500,
              background: "#7C4A0A", color: "#fff",
              borderRadius: "var(--radius-md)", textDecoration: "none",
              whiteSpace: "nowrap",
            }}>
              התאמה אישית ←
            </Link>
          </div>
        )}

        {/* סרגל כלים */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: 3 }}>
            {(["annual", "monthly"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                background: view === v ? "#fff" : "transparent",
                border: "none", padding: "6px 14px", fontSize: 13,
                cursor: "pointer", borderRadius: 6,
                color: view === v ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: view === v ? 500 : 400,
                boxShadow: view === v ? "0 0 0 0.5px var(--border)" : "none",
              }}>
                {v === "annual" ? "שנתי" : "חודשי"}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש אירוע..."
            style={{
              flex: 1, minWidth: 180, padding: "7px 12px", fontSize: 13,
              border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
              background: "#fff", fontFamily: "inherit", outline: "none",
            }}
          />
        </div>

        {/* פילטרים */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
          {([
            { id: "all",       label: "הכל" },
            { id: "education", label: "מנהל החינוך" },
            { id: "youth",     label: "מחלקת הנוער" },
          ] as { id: DeptFilter; label: string }[]).map(f => (
            <button key={f.id} onClick={() => setDeptFilter(f.id)} style={{
              padding: "5px 11px", fontSize: 12, borderRadius: 14,
              border: "0.5px solid var(--border)",
              background: deptFilter === f.id ? "var(--text-primary)" : "#fff",
              color:      deptFilter === f.id ? "#fff" : "var(--text-secondary)",
              cursor: "pointer",
            }}>
              {f.label}
            </button>
          ))}
          {([
            { id: "0-6",        label: "גיל 0–6" },
            { id: "elementary", label: "כיתות א–ו" },
            { id: "secondary",  label: "כיתות ז–יב" },
          ] as { id: AgeFilter; label: string }[]).map(f => (
            <button key={f.id} onClick={() => setAgeFilter(ageFilter === f.id ? "all" : f.id)} style={{
              padding: "5px 11px", fontSize: 12, borderRadius: 14,
              border: "0.5px solid var(--border)",
              background: ageFilter === f.id ? "var(--parent-primary)" : "#fff",
              color:      ageFilter === f.id ? "#fff" : "var(--text-secondary)",
              cursor: "pointer",
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* מקרא */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "0.75rem", fontSize: 11, color: "var(--text-tertiary)" }}>
          {visibleCategories.map(cat => (
            <span key={cat.id} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, display: "inline-block" }} />
              {cat.name}
            </span>
          ))}
        </div>

        {/* תצוגה חודשית */}
        {view === "monthly" && (
          <MonthlyView
            events={filteredEvents.map(e => ({
              id: e.id, name: e.name,
              categoryId: e.catName,
              startMonth: e.startMonth, endMonth: e.endMonth,
              startDay: e.startDay, endDay: e.endDay,
              color: e.catColor,
              ageGroups: e.ageGroups, location: e.location,
            }))}
            onEventClick={id => setSelectedEvent(id)}
            primaryColor="var(--parent-primary)"
          />
        )}

        {/* גאנט שנתי */}
        {view === "annual" && (
        <div className="gantt-scroll-x" style={{ border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ minWidth: 800 }}>
          {/* כותרת חודשים */}
          <div style={{ display: "grid", gridTemplateColumns: "110px repeat(12, 1fr)", borderBottom: "0.5px solid var(--border)", background: "var(--bg-secondary)" }}>
            <div style={{ padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }} />
            {SCHOOL_YEAR_MONTHS.map((m, i) => (
              <div key={m} style={{
                padding: "8px 4px", textAlign: "center", fontSize: 11,
                fontWeight: 500, color: "var(--text-secondary)",
                borderRight: i < 11 ? "0.5px solid var(--border)" : "none",
              }}>
                {MONTHS_HE[i]}
              </div>
            ))}
          </div>

          {/* שורת חגים */}
          <div style={{ display: "grid", gridTemplateColumns: "110px repeat(12, 1fr)", borderBottom: "0.5px solid var(--border)", minHeight: 28, background: "#FFFDF5" }}>
            <div style={{ padding: "6px 12px", fontSize: 10, fontWeight: 500, color: "#BA7517" }}>
              חגים ומועדים
            </div>
            <div style={{ gridColumn: "2 / -1", display: "grid", gridTemplateColumns: "repeat(12, 1fr)", position: "relative" }}>
              {SCHOOL_YEAR_MONTHS.map((m, i) => {
                const holidays = getHolidaysForMonth(m);
                return (
                  <div key={m} style={{ borderRight: i < 11 ? "0.5px solid var(--border)" : "none", padding: "4px 3px", display: "flex", flexWrap: "wrap", gap: 2 }}>
                    {holidays.map(h => (
                      <span key={h.name} title={h.name} style={{
                        fontSize: 9, padding: "1px 4px", borderRadius: 3,
                        background: h.type === "vacation" ? "#FEF3C7" : h.type === "memorial" ? "#F3F4F6" : "#FDE68A",
                        color: h.type === "vacation" ? "#92400E" : h.type === "memorial" ? "#374151" : "#78350F",
                        whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {h.name}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* שורות קטגוריות */}
          {visibleCategories.map(cat => {
            const catEvents = filteredEvents.filter(e => e.catName === cat.name && e.catDept === cat.department);
            return (
              <div key={cat.id} style={{
                display: "grid", gridTemplateColumns: "110px repeat(12, 1fr)",
                borderBottom: "0.5px solid var(--border)", minHeight: 42,
                transition: "background 0.1s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-secondary)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                {/* שם קטגוריה */}
                <div style={{
                  padding: "0 12px", fontSize: 12, fontWeight: 500,
                  color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6,
                  borderLeft: "0.5px solid var(--border)",
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                  {cat.name}
                </div>

                {/* תאי חודשים + אירועים */}
                <div style={{ gridColumn: "2 / -1", display: "grid", gridTemplateColumns: "repeat(12, 1fr)", position: "relative" }}>
                  {SCHOOL_YEAR_MONTHS.map((_, i) => (
                    <div key={i} style={{ borderRight: i < 11 ? "0.5px solid var(--border)" : "none" }} />
                  ))}
                  {catEvents.map(ev => {
                    const style = eventStyle(ev.startMonth, ev.endMonth, cat.color);
                    if (!style) return null;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(selectedEvent === ev.id ? null : ev.id)}
                        title={ev.name}
                        style={{
                          position: "absolute", top: 9, height: 24,
                          borderRadius: 4, padding: "3px 7px",
                          fontSize: 10, fontWeight: 500,
                          cursor: "pointer", whiteSpace: "nowrap",
                          overflow: "hidden", textOverflow: "ellipsis",
                          border: "none", color: "#fff",
                          transition: "transform 0.1s, opacity 0.1s",
                          opacity: selectedEvent && selectedEvent !== ev.id ? 0.6 : 1,
                          ...style,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1.5px)")}
                        onMouseLeave={e => (e.currentTarget.style.transform = "")}
                      >
                        {ev.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </div>
        )}

        {/* חלון פרטי אירוע */}
        {selectedEventData && (
          <div style={{
            marginTop: 16, padding: "1.25rem 1.5rem",
            background: "#fff", border: `1.5px solid ${selectedEventData.catColor}`,
            borderRadius: "var(--radius-lg)", position: "relative",
          }}>
            <button
              onClick={() => setSelectedEvent(null)}
              style={{
                position: "absolute", left: 12, top: 12,
                width: 28, height: 28, border: "none",
                background: "var(--bg-secondary)", borderRadius: "50%",
                cursor: "pointer", fontSize: 16, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}
            >×</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: selectedEventData.catColor, flexShrink: 0 }} />
              <h2 style={{ fontSize: 17, fontWeight: 500, margin: 0, color: "var(--text-primary)" }}>
                {selectedEventData.name}
              </h2>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, color: "var(--text-secondary)" }}>
              <span>📅 {selectedEventData.startDay ? `${selectedEventData.startDay} ` : ""}{MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(selectedEventData.startMonth)]}
                {(selectedEventData.endMonth !== selectedEventData.startMonth || (selectedEventData.endDay && selectedEventData.endDay !== selectedEventData.startDay))
                  ? ` – ${selectedEventData.endDay ? `${selectedEventData.endDay} ` : ""}${MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(selectedEventData.endMonth)]}` : ""}
              </span>
              {selectedEventData.location && <span>📍 {selectedEventData.location}</span>}
              {selectedEventData.responsible && <span>👤 {selectedEventData.responsible}</span>}
              {selectedEventData.ageGroups.length > 0 && <span>👥 {selectedEventData.ageGroups.join(", ")}</span>}
              <span style={{ padding: "2px 8px", borderRadius: 10, background: selectedEventData.catColor + "22", color: selectedEventData.catColor, fontWeight: 500 }}>
                {selectedEventData.catName}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button onClick={() => {
                shareWhatsapp(`🗓 ${selectedEventData.name}\n📅 ${MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(selectedEventData.startMonth)]}${selectedEventData.location ? `\n📍 ${selectedEventData.location}` : ""}\n\nמתוך לוח אופקים`);
              }} style={iconBtnStyle}>
                📤 וואטסאפ
              </button>
              <button onClick={() => {
                const year = selectedEventData.startMonth >= 9 ? 2025 : 2026;
                addToGoogleCalendar({
                  title: selectedEventData.name,
                  location: selectedEventData.location ?? undefined,
                  startYear: year,
                  startMonth: selectedEventData.startMonth,
                  startDay: selectedEventData.startDay ?? 1,
                  endYear: selectedEventData.endMonth >= 9 ? 2025 : 2026,
                  endMonth: selectedEventData.endMonth,
                  endDay: selectedEventData.endDay ?? selectedEventData.startDay ?? 1,
                });
              }} style={iconBtnStyle}>
                📆 Google
              </button>
              <button onClick={() => {
                const year = selectedEventData.startMonth >= 9 ? 2025 : 2026;
                const ical = generateICal([{
                  uid: selectedEventData.id,
                  title: selectedEventData.name,
                  location: selectedEventData.location ?? undefined,
                  startYear: year, startMonth: selectedEventData.startMonth, startDay: selectedEventData.startDay ?? 1,
                  endYear: selectedEventData.endMonth >= 9 ? 2025 : 2026,
                  endMonth: selectedEventData.endMonth,
                  endDay: selectedEventData.endDay ?? selectedEventData.startDay ?? 1,
                }]);
                downloadICal(`event-${selectedEventData.name}`, ical);
                toast("הקובץ ירד! פתח אותו והאירוע יתווסף ליומן שלך 📆", "success");
              }} style={iconBtnStyle}>
                📥 iCal
              </button>
            </div>
          </div>
        )}

        {/* footer */}
        <div style={{
          marginTop: 16, padding: "0.75rem 1rem",
          background: "var(--bg-secondary)", borderRadius: "var(--radius-md)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 11, color: "var(--text-tertiary)", flexWrap: "wrap", gap: 8,
        }}>
          <span>מציג {filteredEvents.length} אירועים · עיריית אופקים תשפ״ו</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/" style={{ fontSize: 11, color: "var(--text-tertiary)", textDecoration: "none" }}>
              ← כניסת עובדים
            </Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
