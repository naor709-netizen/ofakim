"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadProfile, clearProfile, signOutParent, getParentUser, INTEREST_AREAS, type ParentProfile } from "@/lib/parent";
import { CATEGORIES, DEMO_EVENTS, MONTHS_HE, SCHOOL_YEAR_MONTHS, HOLIDAYS } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { getEvents, type DbEvent } from "@/lib/events";

const GRADE_TO_AGE_GROUPS: Record<string, string[]> = {
  "גן": ["גן", "0-3", "3-6", "0-6", "משפחות"],
  "טרום-חובה": ["גן", "0-6", "3-6"],
  "חובה": ["גן", "0-6", "3-6"],
  "א'": ["א-ו", "א-ח", "א-ג", "כיתות א-ו"],
  "ב'": ["א-ו", "א-ח", "א-ג", "כיתות א-ו"],
  "ג'": ["א-ו", "א-ח", "א-ג", "כיתות א-ו"],
  "ד'": ["א-ו", "א-ח", "ד-ח", "כיתות א-ו"],
  "ה'": ["א-ו", "א-ח", "ד-ח", "כיתות א-ו"],
  "ו'": ["א-ו", "א-ח", "ד-ח", "ו", "כיתות א-ו"],
  "ז'": ["ז-ט", "ז-יב", "ד-ח", "כיתות ז-יב"],
  "ח'": ["ז-ט", "ז-יב", "ד-ח", "כיתות ז-יב"],
  "ט'": ["ז-ט", "ז-יב", "כיתות ז-יב"],
  "י'": ["י-יב", "ז-יב", "כיתות ז-יב"],
  "יא'": ["יא", "י-יב", "ז-יב"],
  "יב'": ["יב", "י-יב", "ז-יב"],
};

interface ViewEvent {
  id: string; name: string; categoryId: string;
  startMonth: number; endMonth: number;
  ageGroups: string[]; location?: string | null; responsible?: string | null;
}

export default function MyCalendarPage() {
  const router = useRouter();
  const [profile, setProfile]     = useState<ParentProfile | null>(null);
  const [dbEvents, setDbEvents]   = useState<DbEvent[]>([]);
  const [activeChild, setActiveChild] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const user = await getParentUser();
      if (!user) { router.replace("/luach/login"); return; }
      const p = await loadProfile();
      if (!p) { router.replace("/luach/onboarding"); return; }
      setProfile(p);
    })();

    getEvents().then(setDbEvents);
    const channel = supabase
      .channel("events-my")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        getEvents().then(setDbEvents);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [router]);

  // איחוד מקור נתונים: DB אם יש, אחרת Demo
  const allEvents: ViewEvent[] = useMemo(() => {
    if (dbEvents.length > 0) {
      return dbEvents.map(e => ({
        id: e.id, name: e.name,
        categoryId: e.categories?.name || "",
        startMonth: e.start_month, endMonth: e.end_month,
        ageGroups: e.age_groups || [],
        location: e.location, responsible: e.responsible,
      }));
    }
    return DEMO_EVENTS.map(e => {
      const cat = CATEGORIES.find(c => c.id === e.categoryId);
      return {
        id: e.id, name: e.name, categoryId: cat?.name || "",
        startMonth: e.startMonth, endMonth: e.endMonth,
        ageGroups: e.ageGroups, location: e.location, responsible: e.responsible,
      };
    });
  }, [dbEvents]);

  const filteredEvents = useMemo(() => {
    if (!profile) return [];
    const childrenToCheck = activeChild === "all"
      ? profile.children
      : profile.children.filter(c => c.id === activeChild);

    return allEvents.filter(ev => {
      // התאמה לפי גילאי הילדים
      const matchesAge = childrenToCheck.some(child => {
        const validGroups = GRADE_TO_AGE_GROUPS[child.grade] || [];
        return ev.ageGroups.some(g => validGroups.some(v => g.includes(v) || v.includes(g)));
      });
      return matchesAge;
    }).sort((a, b) => {
      const aIdx = SCHOOL_YEAR_MONTHS.indexOf(a.startMonth);
      const bIdx = SCHOOL_YEAR_MONTHS.indexOf(b.startMonth);
      return aIdx - bIdx;
    });
  }, [allEvents, profile, activeChild]);

  if (!profile) return null;

  // קיבוץ לפי חודש
  const byMonth = SCHOOL_YEAR_MONTHS.map(m => ({
    month: m,
    label: MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(m)],
    events: filteredEvents.filter(e => e.startMonth <= m && e.endMonth >= m),
  })).filter(g => g.events.length > 0);

  const greeting = `שלום משפחת ${profile.familyName} 🌟`;

  return (
    <div style={{ minHeight: "100vh", background: "#fafaf7", padding: "16px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, var(--parent-lighter) 0%, #FFF8EE 100%)",
          borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 500, margin: "0 0 4px", color: "#04342C" }}>
              {greeting}
            </h1>
            <p style={{ fontSize: 12, color: "var(--parent-primary-dark)", margin: 0 }}>
              לוח אישי לפי הילדים שלכם · תשפ״ו
            </p>
          </div>
          <Link href="/luach/settings" style={{
            padding: "6px 12px", fontSize: 12, borderRadius: "var(--radius-md)",
            background: "#fff", color: "var(--parent-primary-dark)",
            border: "0.5px solid var(--parent-light)", textDecoration: "none",
          }}>⚙️ הגדרות</Link>
        </div>

        {/* פילטר ילדים */}
        {profile.children.length > 1 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            <button onClick={() => setActiveChild("all")} style={chipStyle(activeChild === "all")}>
              כל המשפחה
            </button>
            {profile.children.map(c => (
              <button key={c.id} onClick={() => setActiveChild(c.id)} style={chipStyle(activeChild === c.id)}>
                {c.name || "ללא שם"} <span style={{ opacity: 0.7, marginRight: 4 }}>· {c.grade}</span>
              </button>
            ))}
          </div>
        )}

        {/* סטטיסטיקה אישית */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 10, marginBottom: 20,
        }}>
          {[
            { label: "אירועים השנה", value: filteredEvents.length, color: "var(--parent-primary)" },
            { label: "החודש",        value: filteredEvents.filter(e => e.startMonth === new Date().getMonth() + 1).length, color: "#185FA5" },
            { label: "תחומי עניין",  value: profile.interests.length, color: "#7F77DD" },
          ].map(s => (
            <div key={s.label} style={{
              background: "#fff", borderRadius: "var(--radius-md)",
              padding: "12px 14px", border: "0.5px solid var(--border)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* רשימת אירועים מקובצים לפי חודש */}
        {byMonth.length === 0 && (
          <div style={{
            background: "#fff", borderRadius: "var(--radius-lg)",
            padding: "2rem", textAlign: "center", border: "0.5px solid var(--border)",
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
              עדיין אין אירועים שמתאימים לילדים שלכם
            </p>
            <Link href="/luach" style={{
              display: "inline-block", marginTop: 14, padding: "8px 16px",
              background: "var(--parent-primary)", color: "#fff",
              borderRadius: "var(--radius-md)", textDecoration: "none", fontSize: 13,
            }}>
              לצפייה בלוח הכללי ←
            </Link>
          </div>
        )}

        {byMonth.map(group => (
          <div key={group.month} style={{ marginBottom: 20 }}>
            <h3 style={{
              fontSize: 14, fontWeight: 600, margin: "0 0 10px",
              color: "var(--parent-primary-darker)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "var(--parent-light)", color: "var(--parent-primary-darker)",
                fontSize: 11, fontWeight: 600,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                {group.events.length}
              </span>
              {group.label}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {group.events.map(ev => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{
          marginTop: 20, padding: 12, background: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)", display: "flex",
          justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
        }}>
          <Link href="/luach" style={{ fontSize: 12, color: "var(--text-secondary)", textDecoration: "none" }}>
            ← לוח כללי לכולם
          </Link>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={async () => { if (confirm("לאפס את הפרופיל?")) { await clearProfile(); router.push("/luach"); } }}
              style={{ fontSize: 11, color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }}>
              איפוס פרופיל
            </button>
            <button onClick={async () => { await signOutParent(); router.push("/luach"); }}
              style={{ fontSize: 11, color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }}>
              יציאה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: ViewEvent }) {
  const cat = CATEGORIES.find(c => c.name === event.categoryId);
  const color = cat?.color || "var(--parent-primary)";

  function shareWhatsapp() {
    const text = `🗓 ${event.name}\n📅 ${MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(event.startMonth)]}${event.location ? `\n📍 ${event.location}` : ""}\n\nמתוך לוח אופקים`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function addToCalendar() {
    const year  = event.startMonth >= 9 ? 2025 : 2026;
    const date  = `${year}${String(event.startMonth).padStart(2, "0")}01`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${date}/${date}${event.location ? `&location=${encodeURIComponent(event.location)}` : ""}`;
    window.open(url, "_blank");
  }

  return (
    <div style={{
      background: "#fff", borderRadius: "var(--radius-md)",
      border: "0.5px solid var(--border)",
      padding: "12px 14px", display: "flex", gap: 12,
      borderRight: `4px solid ${color}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
          {event.name}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11, color: "var(--text-secondary)" }}>
          {cat?.name && (
            <span style={{ padding: "1px 7px", borderRadius: 8, background: color + "22", color }}>
              {cat.name}
            </span>
          )}
          {event.location    && <span>📍 {event.location}</span>}
          {event.responsible && <span>👤 {event.responsible}</span>}
          {event.ageGroups.length > 0 && <span>👥 {event.ageGroups.join(", ")}</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <button onClick={shareWhatsapp} title="שתף בוואטסאפ" style={iconBtn}>📤</button>
        <button onClick={addToCalendar} title="הוסף ליומן" style={iconBtn}>📆</button>
      </div>
    </div>
  );
}

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 14px", fontSize: 12, borderRadius: 14, whiteSpace: "nowrap",
  border: "0.5px solid var(--border)",
  background: active ? "var(--parent-primary)" : "#fff",
  color:      active ? "#fff" : "var(--text-secondary)",
  cursor: "pointer", fontFamily: "inherit",
});

const iconBtn: React.CSSProperties = {
  width: 28, height: 28, border: "0.5px solid var(--border)",
  background: "#fff", borderRadius: "var(--radius-sm)",
  cursor: "pointer", fontSize: 14,
};
