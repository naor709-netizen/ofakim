"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CATEGORIES, DEMO_EVENTS, MONTHS_HE, SCHOOL_YEAR_MONTHS,
  HOLIDAYS, type Department, type Category, type Event,
} from "@/lib/data";
import BotChat from "@/components/BotChat";
import MonthlyView from "@/components/MonthlyView";
import { supabase } from "@/lib/supabase";
import { getCategories, getEvents, createEvent, updateEvent, deleteEvent, type DbEvent, type DbCategory } from "@/lib/events";
import { logAudit, getInfrastructures, type Infrastructure } from "@/lib/infrastructure";
import { loadSession, clearSession, type AppUser } from "@/lib/auth";
import { useToast } from "@/components/Toast";

interface StaffGanttProps {
  department: Department;
}

const DEPT_CONFIG = {
  education: {
    label:       "מנהל החינוך",
    primary:     "#185FA5",
    primaryDark: "#0C447C",
    light:       "#B5D4F4",
    lighter:     "#E6F1FB",
    bg:          "#fafaf7",
    greeting:    "ברוכים הבאים,",
  },
  youth: {
    label:       "מחלקת הנוער",
    primary:     "#D85A30",
    primaryDark: "#993C1D",
    light:       "#F5C4B3",
    lighter:     "#FAECE7",
    bg:          "#fdfaf7",
    greeting:    "ברוכים הבאים,",
  },
};

function getHolidaysForMonth(month: number) {
  return HOLIDAYS.filter(h => h.month === month);
}

function eventStyle(startMonth: number, endMonth: number, color: string) {
  const startIdx = SCHOOL_YEAR_MONTHS.indexOf(startMonth);
  const endIdx   = SCHOOL_YEAR_MONTHS.indexOf(endMonth);
  if (startIdx < 0 || endIdx < 0) return null;
  const left  = (startIdx / 12) * 100;
  const width = ((endIdx - startIdx + 1) / 12) * 100;
  return { left: `${left}%`, width: `calc(${width}% - 4px)`, background: color };
}

type ViewEvent = {
  id: string; name: string; categoryId: string;
  startMonth: number; endMonth: number;
  startDay?: number | null; endDay?: number | null;
  startYear?: number | null; endYear?: number | null;
  ageGroups: string[]; location?: string | null; responsible?: string | null; status: string;
};

const SCHOOL_YEARS = [
  { id: 2024, label: "תשפ״ה (2024-25)", startYear: 2024, endYear: 2025 },
  { id: 2025, label: "תשפ״ו (2025-26)", startYear: 2025, endYear: 2026 },
  { id: 2026, label: "תשפ״ז (2026-27)", startYear: 2026, endYear: 2027 },
];

export default function StaffGantt({ department }: StaffGanttProps) {
  const cfg = DEPT_CONFIG[department];
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<AppUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.push("/login?dept=" + department);
      return;
    }
    if (session.role !== "admin" && session.department !== department) {
      // עובד שמנסה להיכנס למחלקה לא שלו - מנתב לשלו
      router.push(session.department === "education" ? "/education" : "/youth");
      return;
    }
    setUser(session);
    setAuthChecked(true);
  }, [router, department]);

  function handleLogout() {
    clearSession();
    router.push("/");
  }

  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [filterDept, setFilterDept] = useState<"mine" | "all">("all");
  const [conflictWarning, setConflictWarning] = useState<string[] | null>(null);

  // נתונים מ-Supabase
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [dbEvents, setDbEvents] = useState<DbEvent[]>([]);
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
  const [creating, setCreating] = useState(false);

  // שנת לימודים - מחושב מתאריך היום
  const todayDate = new Date();
  const defaultYear = todayDate.getMonth() + 1 >= 9 ? todayDate.getFullYear() : todayDate.getFullYear() - 1;
  const [schoolYear, setSchoolYear] = useState<number>(defaultYear);

  useEffect(() => {
    getCategories().then(setDbCategories);
    getInfrastructures().then(setInfrastructures);
    getEvents().then(setDbEvents);

    const channel = supabase
      .channel("events-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        getEvents().then(setDbEvents);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // המרת אירועי DB לפורמט תצוגה
  const allViewEvents: ViewEvent[] = useMemo(() => [
    ...dbEvents.map(e => ({
      id: e.id, name: e.name,
      categoryId: e.category_id,
      startMonth: e.start_month, endMonth: e.end_month,
      startDay: e.start_day, endDay: e.end_day,
      startYear: e.start_year, endYear: e.end_year,
      ageGroups: e.age_groups || [],
      location: e.location, responsible: e.responsible,
      status: e.status,
    })),
  ], [dbEvents]);

  // קטגוריות תצוגה — תמיד מ-Supabase. רק אם עוד לא נטענו (טוענים) — fallback מקומי
  type DisplayCat = { id: string; name: string; department: "education" | "youth"; color: string };
  const dbReady = dbCategories.length > 0;
  const allCats: DisplayCat[] = dbReady
    ? dbCategories.map(c => ({ id: c.id, name: c.name, department: c.department, color: c.color }))
    : CATEGORIES.map(c => ({ id: c.id as string, name: c.name, department: c.department, color: c.color }));

  const myCategories = allCats.filter(c => c.department === department);
  const visibleCats  = filterDept === "mine" ? myCategories : allCats;

  // מחזיר את שנת הלימודים של אירוע (שנת ספטמבר שלו)
  function eventSchoolYear(e: ViewEvent): number {
    const startY = e.startYear ?? (e.startMonth >= 9 ? 2025 : 2026);
    return e.startMonth >= 9 ? startY : startY - 1;
  }

  const filteredEvents = useMemo(() => {
    return allViewEvents.filter(e => {
      const cat = allCats.find(c => c.id === e.categoryId);
      if (!cat) return false;
      if (!visibleCats.find(c => c.id === e.categoryId)) return false;
      if (search && !e.name.includes(search)) return false;
      // סינון לפי שנת לימודים
      if (eventSchoolYear(e) !== schoolYear) return false;
      return true;
    });
  }, [allViewEvents, allCats, visibleCats, search, schoolYear]);

  const selectedEventData = selectedEvent ? allViewEvents.find(e => e.id === selectedEvent) : null;
  const selectedCat = selectedEventData ? allCats.find(c => c.id === selectedEventData.categoryId) : null;

  const myEvents     = allViewEvents.filter(e => allCats.find(c => c.id === e.categoryId && c.department === department));
  const thisMonthEvs = myEvents.filter(e => e.startMonth === new Date().getMonth() + 1);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<"annual" | "monthly">("annual");

  function ymdToDate(year: number | null | undefined, month: number, day: number): string {
    const y = year ?? (month >= 9 ? 2025 : 2026);
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  function dateToYMD(dateStr: string): { year: number; month: number; day: number } {
    const [y, m, d] = dateStr.split("-").map(Number);
    return { year: y, month: m, day: d };
  }

  const today = new Date().toISOString().slice(0, 10);
  const [newEvent, setNewEvent] = useState({
    name: "", categoryId: "",
    startDate: today, endDate: today,
    ageGroups: "", location: "", responsible: "",
  });

  function startEdit(ev: ViewEvent) {
    const startDay  = ev.startDay  ?? 1;
    const endDay    = ev.endDay    ?? startDay;
    const startYear = (ev as ViewEvent & { startYear?: number | null }).startYear ?? null;
    const endYear   = (ev as ViewEvent & { endYear?: number | null }).endYear   ?? null;
    setEditingId(ev.id);
    setNewEvent({
      name:        ev.name,
      categoryId:  ev.categoryId,
      startDate:   ymdToDate(startYear, ev.startMonth, startDay),
      endDate:     ymdToDate(endYear,   ev.endMonth,   endDay),
      ageGroups:   ev.ageGroups.join(", "),
      location:    ev.location ?? "",
      responsible: ev.responsible ?? "",
    });
    setShowNewEvent(true);
    setSelectedEvent(null);
  }

  useEffect(() => {
    if (myCategories.length && (!newEvent.categoryId || !myCategories.find(c => c.id === newEvent.categoryId))) {
      setNewEvent(p => ({ ...p, categoryId: myCategories[0].id }));
    }
  }, [myCategories, newEvent.categoryId]);

  async function handleCreateEvent(skipConflictCheck = false) {
    const start = dateToYMD(newEvent.startDate);
    const end   = dateToYMD(newEvent.endDate);

    if (!editingId && !skipConflictCheck) {
      const conflicts = allViewEvents.filter(e =>
        e.startMonth <= end.month && e.endMonth >= start.month
      ).map(e => e.name);
      if (conflicts.length > 0) { setConflictWarning(conflicts.slice(0, 3)); return; }
    }
    setCreating(true);
    const payload = {
      name:        newEvent.name,
      category_id: newEvent.categoryId,
      start_month: start.month,
      end_month:   end.month,
      start_day:   start.day,
      end_day:     end.day,
      start_year:  start.year,
      end_year:    end.year,
      age_groups:  newEvent.ageGroups ? newEvent.ageGroups.split(",").map(s => s.trim()).filter(Boolean) : [],
      location:    newEvent.location || null,
      responsible: newEvent.responsible || null,
    };
    const result = editingId
      ? await updateEvent(editingId, payload)
      : await createEvent(payload);
    setCreating(false);
    if (result.error) {
      toast("שגיאה: " + result.error.message, "error");
      return;
    }
    toast(editingId ? "האירוע עודכן בהצלחה ✨" : "האירוע נוצר בהצלחה ✨", "success");
    logAudit({
      user_name:  user?.full_name ?? null,
      event_id:   result.data?.id ?? null,
      event_name: payload.name,
      action:     editingId ? "update" : "create",
      department: department,
    }).catch(() => {});
    getEvents().then(setDbEvents);
    setShowNewEvent(false);
    setConflictWarning(null);
    setEditingId(null);
    setNewEvent({ name: "", categoryId: myCategories[0]?.id ?? "", startDate: today, endDate: today, ageGroups: "", location: "", responsible: "" });
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק את האירוע? לא ניתן לשחזר.")) return;
    const ev = allViewEvents.find(e => e.id === id);
    const { error } = await deleteEvent(id);
    if (error) { toast("שגיאה במחיקה: " + error.message, "error"); return; }
    toast("האירוע נמחק", "success");
    if (ev) logAudit({
      user_name: user?.full_name ?? null,
      event_id: id, event_name: ev.name, action: "delete", department: department,
    }).catch(() => {});
    getEvents().then(setDbEvents);
    setSelectedEvent(null);
  }

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", background: cfg.bg }}>
        <div style={{ background: cfg.primary, height: 52 }} />
        <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
          <div className="skeleton" style={{ height: 80, marginBottom: 16, borderRadius: 14 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div className="skeleton" style={{ height: 38, width: 130, borderRadius: 10 }} />
            <div className="skeleton" style={{ height: 38, width: 200, borderRadius: 10 }} />
            <div className="skeleton" style={{ flex: 1, height: 38, borderRadius: 10 }} />
          </div>
          <div className="skeleton" style={{ height: 400, borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: cfg.bg }}>

      {/* סרגל עליון */}
      <div style={{
        background: cfg.primary, color: "#fff",
        padding: "0 24px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 13 }}>
            → פורטל אופקים
          </Link>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{cfg.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
              {user.full_name}
            </span>
          )}
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 500,
          }}>
            {user?.full_name[0] || "?"}
          </div>
          <button onClick={handleLogout} title="יציאה" style={{
            background: "rgba(255,255,255,0.15)", color: "#fff",
            border: "none", padding: "4px 10px", fontSize: 11,
            borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "inherit",
          }}>
            יציאה
          </button>
        </div>
      </div>

      <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>

        {/* Hello Bar */}
        <div style={{
          background: `linear-gradient(135deg, ${cfg.lighter} 0%, #FFF8EE 100%)`,
          borderRadius: "var(--radius-lg)", padding: "1rem 1.5rem",
          marginBottom: 16, display: "flex", alignItems: "center",
          justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 2px" }}>{cfg.greeting}</p>
            <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0, color: cfg.primaryDark }}>
              גאנט {SCHOOL_YEARS.find(y => y.id === schoolYear)?.label.split(" ")[0] || "השנה"} ☀️
            </h1>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { label: "אירועים השנה", value: myEvents.length },
              { label: "החודש הנוכחי",  value: thisMonthEvs.length },
            ].map(s => (
              <div key={s.label} style={{
                textAlign: "center", background: "#fff",
                borderRadius: "var(--radius-md)", padding: "8px 18px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: cfg.primary }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* סרגל פעולות */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button
            onClick={() => setShowNewEvent(true)}
            disabled={!dbReady}
            title={!dbReady ? "טוען נתונים..." : ""}
            style={{
              background: dbReady ? cfg.primary : "var(--bg-secondary)",
              color: dbReady ? "#fff" : "var(--text-tertiary)",
              border: "none", padding: "8px 16px",
              borderRadius: "var(--radius-md)", fontSize: 13,
              fontWeight: 500, cursor: dbReady ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            + אירוע חדש
          </button>

          <select
            value={schoolYear}
            onChange={e => setSchoolYear(Number(e.target.value))}
            style={{
              padding: "7px 11px", fontSize: 12,
              border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
              fontFamily: "inherit", background: "#fff", outline: "none",
              cursor: "pointer", color: cfg.primaryDark, fontWeight: 500,
            }}
          >
            {SCHOOL_YEARS.map(y => (
              <option key={y.id} value={y.id}>{y.label}</option>
            ))}
          </select>

          <div style={{ display: "inline-flex", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: 3 }}>
            {([{ id: "annual", label: "שנתי" }, { id: "monthly", label: "חודשי" }] as const).map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                background: view === v.id ? "#fff" : "transparent",
                border: "none", padding: "6px 12px", fontSize: 12,
                cursor: "pointer", borderRadius: 6,
                color: view === v.id ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: view === v.id ? 500 : 400,
                boxShadow: view === v.id ? "0 0 0 0.5px var(--border)" : "none",
              }}>
                {v.label}
              </button>
            ))}
          </div>

          <div style={{ display: "inline-flex", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: 3 }}>
            {([{ id: "all", label: "כל המחלקות" }, { id: "mine", label: "המחלקה שלי" }] as const).map(f => (
              <button key={f.id} onClick={() => setFilterDept(f.id)} style={{
                background: filterDept === f.id ? "#fff" : "transparent",
                border: "none", padding: "6px 12px", fontSize: 12,
                cursor: "pointer", borderRadius: 6,
                color: filterDept === f.id ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: filterDept === f.id ? 500 : 400,
                boxShadow: filterDept === f.id ? "0 0 0 0.5px var(--border)" : "none",
              }}>
                {f.label}
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

          <Link href="/luach" style={{
            padding: "7px 14px", fontSize: 12,
            border: "0.5px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "#fff", color: "var(--text-secondary)",
            textDecoration: "none", whiteSpace: "nowrap",
          }}>
            👁 תצוגת תושבים
          </Link>
        </div>

        {/* מקרא */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10, fontSize: 11, color: "var(--text-tertiary)" }}>
          {visibleCats.map(cat => (
            <span key={cat.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, display: "inline-block" }} />
              {cat.name}
            </span>
          ))}
        </div>

        {/* תצוגה חודשית */}
        {view === "monthly" && (
          <div style={{ marginBottom: 16 }}>
            <MonthlyView
              events={filteredEvents.map(e => {
                const cat = allCats.find(c => c.id === e.categoryId);
                return {
                  id: e.id, name: e.name, categoryId: e.categoryId,
                  startMonth: e.startMonth, endMonth: e.endMonth,
                  startDay: e.startDay, endDay: e.endDay,
                  color: cat?.color || "#888",
                  ageGroups: e.ageGroups, location: e.location,
                };
              })}
              onEventClick={id => setSelectedEvent(id)}
              onDayClick={(month, day) => {
                const year = month >= 9 ? 2025 : 2026;
                const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                setNewEvent(p => ({ ...p, startDate: dateStr, endDate: dateStr }));
                setShowNewEvent(true);
              }}
              primaryColor={cfg.primary}
            />
          </div>
        )}

        {/* גאנט שנתי */}
        {view === "annual" && (
        <div style={{ border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: 16 }}>

          {/* כותרת חודשים */}
          <div style={{ display: "grid", gridTemplateColumns: "120px repeat(12, 1fr)", borderBottom: "0.5px solid var(--border)", background: "var(--bg-secondary)" }}>
            <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--text-secondary)" }} />
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
          <div style={{ display: "grid", gridTemplateColumns: "120px repeat(12, 1fr)", borderBottom: "0.5px solid var(--border)", background: "#FFFDF5" }}>
            <div style={{ padding: "5px 12px", fontSize: 10, fontWeight: 500, color: "#BA7517", display: "flex", alignItems: "center" }}>
              חגים ומועדים
            </div>
            <div style={{ gridColumn: "2 / -1", display: "grid", gridTemplateColumns: "repeat(12, 1fr)" }}>
              {SCHOOL_YEAR_MONTHS.map((m, i) => {
                const holidays = getHolidaysForMonth(m);
                return (
                  <div key={m} style={{ borderRight: i < 11 ? "0.5px solid var(--border)" : "none", padding: "3px 3px", display: "flex", flexWrap: "wrap", gap: 2 }}>
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
          {visibleCats.map(cat => {
            const isMyDept = cat.department === department;
            const catEvents = filteredEvents.filter(e => e.categoryId === cat.id);
            return (
              <div key={cat.id} style={{
                display: "grid", gridTemplateColumns: "120px repeat(12, 1fr)",
                borderBottom: "0.5px solid var(--border)", minHeight: 44,
                background: isMyDept ? "transparent" : "rgba(0,0,0,0.015)",
                transition: "background 0.1s",
              }}
                onMouseEnter={e => { if (isMyDept) e.currentTarget.style.background = cfg.lighter + "44"; }}
                onMouseLeave={e => { e.currentTarget.style.background = isMyDept ? "transparent" : "rgba(0,0,0,0.015)"; }}
              >
                <div style={{
                  padding: "0 12px", fontSize: 12,
                  fontWeight: isMyDept ? 500 : 400,
                  color: isMyDept ? "var(--text-primary)" : "var(--text-tertiary)",
                  display: "flex", alignItems: "center", gap: 6,
                  borderLeft: "0.5px solid var(--border)",
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, flexShrink: 0, opacity: isMyDept ? 1 : 0.5 }} />
                  {cat.name}
                  {!isMyDept && <span style={{ fontSize: 9, color: "var(--text-tertiary)", marginRight: 2 }}>
                    ({cat.department === "education" ? "חינוך" : "נוער"})
                  </span>}
                </div>
                <div style={{ gridColumn: "2 / -1", display: "grid", gridTemplateColumns: "repeat(12, 1fr)", position: "relative" }}>
                  {SCHOOL_YEAR_MONTHS.map((_, i) => (
                    <div key={i} style={{ borderRight: i < 11 ? "0.5px solid var(--border)" : "none" }} />
                  ))}
                  {catEvents.map(ev => {
                    const style = eventStyle(ev.startMonth, ev.endMonth, isMyDept ? cat.color : cat.color + "88");
                    if (!style) return null;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(selectedEvent === ev.id ? null : ev.id)}
                        title={ev.name}
                        style={{
                          position: "absolute", top: 10, height: 24,
                          borderRadius: 4, padding: "3px 7px",
                          fontSize: 10, fontWeight: 500,
                          cursor: "pointer", whiteSpace: "nowrap",
                          overflow: "hidden", textOverflow: "ellipsis",
                          border: "none", color: "#fff",
                          transition: "transform 0.1s",
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
        )}

        {/* פרטי אירוע שנבחר */}
        {selectedEventData && (
          <div ref={el => { if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }} style={{
            padding: "1.25rem 1.5rem", marginBottom: 16,
            background: "#fff", border: `2px solid ${selectedCat?.color || cfg.primary}`,
            borderRadius: "var(--radius-lg)", position: "relative",
            boxShadow: `0 8px 24px ${selectedCat?.color || cfg.primary}22`,
          }}>
            <button onClick={() => setSelectedEvent(null)} style={{
              position: "absolute", left: 12, top: 12,
              width: 28, height: 28, border: "none",
              background: "var(--bg-secondary)", borderRadius: "50%",
              cursor: "pointer", fontSize: 16,
            }}>×</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: selectedCat?.color || cfg.primary, flexShrink: 0 }} />
              <h2 style={{ fontSize: 17, fontWeight: 500, margin: 0 }}>{selectedEventData.name}</h2>
              {selectedCat && (
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 10,
                  background: selectedCat.color + "22", color: selectedCat.color,
                }}>
                  {selectedCat.name}
                </span>
              )}
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 10,
                background: selectedEventData.status === "published" ? "#DCFCE7" : "#FEF9C3",
                color: selectedEventData.status === "published" ? "#166534" : "#854D0E",
              }}>
                {selectedEventData.status === "published" ? "מפורסם" : "טיוטה"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
              <span>📅 {selectedEventData.startDay ? `${selectedEventData.startDay} ` : ""}{MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(selectedEventData.startMonth)]}
                {(selectedEventData.endMonth !== selectedEventData.startMonth || (selectedEventData.endDay && selectedEventData.endDay !== selectedEventData.startDay))
                  ? ` – ${selectedEventData.endDay ? `${selectedEventData.endDay} ` : ""}${MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(selectedEventData.endMonth)]}` : ""}
              </span>
              {selectedEventData.location   && <span>📍 {selectedEventData.location}</span>}
              {selectedEventData.responsible && <span>👤 {selectedEventData.responsible}</span>}
              {selectedEventData.ageGroups.length > 0 && <span>👥 {selectedEventData.ageGroups.join(", ")}</span>}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => selectedEventData && startEdit(selectedEventData)} style={{
                padding: "10px 20px", fontSize: 13, fontWeight: 500,
                borderRadius: "var(--radius-md)",
                background: cfg.primary, color: "#fff", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}>✏️ ערוך אירוע</button>
              <button onClick={() => handleDelete(selectedEventData.id)} style={{
                padding: "10px 20px", fontSize: 13, fontWeight: 500,
                borderRadius: "var(--radius-md)",
                background: "#fff", color: "var(--danger)",
                border: `1px solid var(--danger)`, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}>🗑 מחק</button>
            </div>
          </div>
        )}
      </div>

      {/* מודל יצירת אירוע */}
      {showNewEvent && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget) { setShowNewEvent(false); setConflictWarning(null); setEditingId(null); }}}>
          <div style={{
            background: "#fff", borderRadius: "var(--radius-xl)",
            padding: "1.75rem", width: "100%", maxWidth: 480,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            position: "relative",
          }}>
            <button onClick={() => { setShowNewEvent(false); setConflictWarning(null); setEditingId(null); }} style={{
              position: "absolute", left: 16, top: 16,
              width: 30, height: 30, border: "none",
              background: "var(--bg-secondary)", borderRadius: "50%",
              cursor: "pointer", fontSize: 16,
            }}>×</button>

            <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 1.25rem", color: cfg.primaryDark }}>
              {editingId ? "✏️ עריכת אירוע" : "+ אירוע חדש"}
            </h2>

            {/* התראת התנגשות */}
            {conflictWarning && (
              <div style={{
                background: "#FFF8EE", border: "1px solid #F5C57E",
                borderRadius: "var(--radius-md)", padding: "0.75rem 1rem",
                marginBottom: "1rem", fontSize: 13,
              }}>
                <p style={{ margin: "0 0 6px", fontWeight: 500, color: "#7C4A0A" }}>
                  👀 שים לב — יש אירועים אחרים בתקופה זו:
                </p>
                {conflictWarning.map(name => (
                  <p key={name} style={{ margin: "2px 0", color: "#92400E", fontSize: 12 }}>• {name}</p>
                ))}
                <p style={{ margin: "8px 0 0", color: "#6B7280", fontSize: 12 }}>
                  אפשר להמשיך — זו רק תזכורת 🙂
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => handleCreateEvent(true)} style={{
                    padding: "6px 14px", fontSize: 12, borderRadius: "var(--radius-md)",
                    background: cfg.primary, color: "#fff", border: "none", cursor: "pointer",
                  }}>
                    המשך וצור אירוע
                  </button>
                  <button onClick={() => setConflictWarning(null)} style={{
                    padding: "6px 14px", fontSize: 12, borderRadius: "var(--radius-md)",
                    background: "#fff", border: "0.5px solid var(--border)", cursor: "pointer",
                  }}>
                    בדוק שוב
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "שם האירוע *", key: "name", type: "text", placeholder: "למשל: יום פתוח גנים" },
                { label: "אחראי האירוע *", key: "responsible", type: "text", placeholder: "שם הרכז" },
                { label: "קהל יעד / גיל", key: "ageGroups", type: "text", placeholder: "למשל: כיתות ז-ט" },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    {field.label}
                  </label>
                  <input
                    value={(newEvent as unknown as Record<string, string>)[field.key]}
                    onChange={e => setNewEvent(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{
                      width: "100%", padding: "8px 11px", fontSize: 13,
                      border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                      fontFamily: "inherit", outline: "none",
                    }}
                  />
                </div>
              ))}

              {/* שדה מיקום: בחירה מהמאגר + טקסט חופשי */}
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  מיקום
                </label>
                {infrastructures.length > 0 && (
                  <select
                    value={infrastructures.find(i => i.name === newEvent.location)?.id || ""}
                    onChange={e => {
                      const selected = infrastructures.find(i => i.id === e.target.value);
                      setNewEvent(prev => ({ ...prev, location: selected?.name || "" }));
                    }}
                    style={{
                      width: "100%", padding: "8px 11px", fontSize: 13,
                      border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                      fontFamily: "inherit", background: "#fff", outline: "none",
                      marginBottom: 6,
                    }}
                  >
                    <option value="">— בחר ממאגר התשתיות —</option>
                    {infrastructures.map(infra => (
                      <option key={infra.id} value={infra.id}>
                        {infra.name} ({infra.type}{infra.capacity ? `, עד ${infra.capacity}` : ""})
                      </option>
                    ))}
                  </select>
                )}
                <input
                  value={newEvent.location}
                  onChange={e => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="או הקלד מיקום חופשי..."
                  style={{
                    width: "100%", padding: "8px 11px", fontSize: 13,
                    border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                    fontFamily: "inherit", outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  תחום *
                </label>
                <select
                  value={newEvent.categoryId}
                  onChange={e => setNewEvent(prev => ({ ...prev, categoryId: e.target.value as typeof prev.categoryId }))}
                  style={{
                    width: "100%", padding: "8px 11px", fontSize: 13,
                    border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                    fontFamily: "inherit", background: "#fff", outline: "none",
                  }}
                >
                  {myCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    תאריך התחלה *
                  </label>
                  <input
                    type="date"
                    value={newEvent.startDate}
                    min="2024-09-01"
                    max="2027-08-31"
                    onChange={e => {
                      const v = e.target.value;
                      setNewEvent(prev => ({
                        ...prev,
                        startDate: v,
                        endDate: prev.endDate < v ? v : prev.endDate,
                      }));
                    }}
                    style={{
                      width: "100%", padding: "8px 11px", fontSize: 13,
                      border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                      fontFamily: "inherit", background: "#fff", outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    תאריך סיום
                  </label>
                  <input
                    type="date"
                    value={newEvent.endDate}
                    min={newEvent.startDate}
                    max="2027-08-31"
                    onChange={e => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))}
                    style={{
                      width: "100%", padding: "8px 11px", fontSize: 13,
                      border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                      fontFamily: "inherit", background: "#fff", outline: "none",
                    }}
                  />
                </div>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "-4px 0 0" }}>
                טווח: ספטמבר 2024 – אוגוסט 2027 (תשפ״ה / תשפ״ו / תשפ״ז)
              </p>

              {!conflictWarning && (
                <button
                  onClick={() => handleCreateEvent(false)}
                  disabled={!newEvent.name || creating}
                  style={{
                    marginTop: 4, padding: "10px 0", fontSize: 14, fontWeight: 500,
                    background: newEvent.name ? cfg.primary : "var(--bg-secondary)",
                    color: newEvent.name ? "#fff" : "var(--text-tertiary)",
                    border: "none", borderRadius: "var(--radius-md)", cursor: newEvent.name ? "pointer" : "not-allowed",
                    width: "100%",
                  }}
                >
                  {creating ? "שומר..." : editingId ? "שמור שינויים" : "צור אירוע"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <BotChat />

      <style>{`
        @media (max-width: 768px) {
          .gantt-table { display: none !important; }
          .mobile-events { display: flex !important; }
          .hello-bar-stats { display: none !important; }
        }
      `}</style>
    </div>
  );
}
