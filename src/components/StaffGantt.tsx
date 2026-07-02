"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CATEGORIES, DEMO_EVENTS, MONTHS_HE, SCHOOL_YEAR_MONTHS,
  HOLIDAYS, type Department, type Category, type Event,
} from "@/lib/data";
import BotChat from "@/components/BotChat";
import MonthlyView from "@/components/MonthlyView";
import { supabase } from "@/lib/supabase";
import { getCategories, getEvents, createEvent, updateEvent, deleteEvent, uploadEventPoster, type DbEvent, type DbCategory } from "@/lib/events";
import { logAudit, getInfrastructures, createInfrastructure, type Infrastructure } from "@/lib/infrastructure";

const INFRA_TYPES = ["אולם", "מועדון", "אולם ספורט", "בית ספר", "גן", "מרחב חוץ", "אחר"];
import { loadSession, clearSession, type AppUser } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { TopBar } from "@/components/v3/TopBar";
import { IcsImportModal, type IcsImportPayload } from "@/components/IcsImportModal";

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

const DAYS_IN_MONTH: Record<number, number> = {
  1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
  7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
};

// רוחב מינימלי לאירוע בגאנט (% של רוחב כולל) — מבטיח שטקסט יהיה קריא
const MIN_EVENT_WIDTH = 5;

// מחשב מיקום אירוע בגאנט ברמת היום (לא רק החודש)
function eventStyle(
  startMonth: number,
  endMonth: number,
  color: string,
  startDay?: number | null,
  endDay?: number | null,
) {
  const startIdx = SCHOOL_YEAR_MONTHS.indexOf(startMonth);
  let endIdx     = SCHOOL_YEAR_MONTHS.indexOf(endMonth);
  if (startIdx < 0 || endIdx < 0) return null;
  // אירוע שחוצה גבול שנת לימודים (למשל אוגוסט → ספטמבר) — clamp לסוף השנה הנוכחית
  if (endIdx < startIdx) endIdx = 11;

  const monthW = 100 / 12; // ≈ 8.333%
  const sDays  = DAYS_IN_MONTH[startMonth] || 30;
  const eDays  = DAYS_IN_MONTH[endMonth] || 30;
  // מיקום מדויק בתוך החודש: 0 = תחילת החודש, 1 = סופו
  const startOffset = startDay ? Math.max(0, (startDay - 1) / sDays) : 0;
  const endOffset   = endDay   ? Math.min(1,  endDay      / eDays)   : 1;

  const left  = (startIdx + startOffset) * monthW;
  const right = (endIdx   + endOffset)   * monthW;
  // מינימום רוחב כדי שטקסט יהיה קריא (אירוע יום-אחד מורחב ויזואלית)
  const width = Math.max(right - left, MIN_EVENT_WIDTH);
  // אירוע בסוף השנה לא יגלוש מחוץ לגאנט (ייחתך ע"י overflow)
  const clampedLeft = Math.max(0, Math.min(left, 100 - width));

  return { insetInlineStart: `${clampedLeft}%`, width: `calc(${width}% - 2px)`, background: color };
}

type ViewEvent = {
  id: string; name: string; categoryId: string; categoryIds: string[];
  startMonth: number; endMonth: number;
  startDay?: number | null; endDay?: number | null;
  startYear?: number | null; endYear?: number | null;
  startTime?: string | null; endTime?: string | null;
  ageGroups: string[]; location?: string | null; responsible?: string | null; status: string;
  description?: string | null;
  imageUrl?: string | null;
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
  const [filterDept, setFilterDept] = useState<"all" | "education" | "youth">("all");
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
      categoryIds: (e.category_ids && e.category_ids.length > 0) ? e.category_ids : [e.category_id],
      startMonth: e.start_month, endMonth: e.end_month,
      startDay: e.start_day, endDay: e.end_day,
      startYear: e.start_year, endYear: e.end_year,
      startTime: e.start_time, endTime: e.end_time,
      ageGroups: e.age_groups || [],
      location: e.location, responsible: e.responsible,
      status: e.status,
      description: e.description,
      imageUrl: e.image_url,
    })),
  ], [dbEvents]);

  // קטגוריות תצוגה — תמיד מ-Supabase. רק אם עוד לא נטענו (טוענים) — fallback מקומי
  type DisplayCat = { id: string; name: string; department: "education" | "youth" | "both"; color: string };
  const dbReady = dbCategories.length > 0;
  const allCats: DisplayCat[] = dbReady
    ? dbCategories.map(c => ({ id: c.id, name: c.name, department: c.department, color: c.color }))
    : CATEGORIES.map(c => ({ id: c.id as string, name: c.name, department: c.department as DisplayCat["department"], color: c.color }));

  const myCategories    = allCats.filter(c => c.department === department || c.department === "both");
  const otherCategories = allCats.filter(c => c.department !== department && c.department !== "both");
  const visibleCats  = filterDept === "all"
    ? [...myCategories, ...otherCategories]
    : allCats.filter(c => c.department === filterDept || c.department === "both");

  // מחזיר את שנת הלימודים של אירוע (שנת ספטמבר שלו)
  function eventSchoolYear(e: ViewEvent): number {
    // אירוע ישן ללא שנה — משויך לשנת הלימודים הנוכחית
    if (e.startYear == null) return defaultYear;
    return e.startMonth >= 9 ? e.startYear : e.startYear - 1;
  }

  function eventMatchesCat(e: ViewEvent, catId: string): boolean {
    if (e.categoryIds && e.categoryIds.length > 0) return e.categoryIds.includes(catId);
    return e.categoryId === catId;
  }

  const filteredEvents = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    return allViewEvents.filter(e => {
      const evCats = e.categoryIds && e.categoryIds.length > 0 ? e.categoryIds : [e.categoryId];
      const primaryCat = allCats.find(c => evCats.includes(c.id));
      if (!primaryCat) return false;
      if (!evCats.some(ec => visibleCats.find(c => c.id === ec))) return false;
      if (searchLower) {
        const catNames = evCats.map(ec => allCats.find(c => c.id === ec)?.name).filter(Boolean).join(" ");
        const haystack = [
          e.name, e.location, e.responsible, e.description,
          ...(e.ageGroups || []), catNames,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      if (eventSchoolYear(e) !== schoolYear) return false;
      return true;
    });
  }, [allViewEvents, allCats, visibleCats, search, schoolYear]);

  // הקצאת נתיבים (lanes) — מבוסס גבולות ויזואליים (% של רוחב גאנט)
  // כדי שאירועי יום-אחד שמורחבים למינימום-רוחב לא יחפפו ויזואלית באותה שורה
  const lanesByCat = useMemo(() => {
    const laned = new Map<string, { ev: ViewEvent; lane: number }[]>();
    const counts = new Map<string, number>();
    const monthW = 100 / 12;
    const boundsOf = (ev: ViewEvent) => {
      const sIdx = SCHOOL_YEAR_MONTHS.indexOf(ev.startMonth);
      let   eIdx = SCHOOL_YEAR_MONTHS.indexOf(ev.endMonth);
      if (sIdx < 0 || eIdx < 0) return { start: 0, end: MIN_EVENT_WIDTH };
      if (eIdx < sIdx) eIdx = 11;
      const sDays = DAYS_IN_MONTH[ev.startMonth] || 30;
      const eDays = DAYS_IN_MONTH[ev.endMonth]   || 30;
      const sOff = ev.startDay ? Math.max(0, (ev.startDay - 1) / sDays) : 0;
      const eOff = ev.endDay   ? Math.min(1,  ev.endDay      / eDays)   : 1;
      const rawStart = (sIdx + sOff) * monthW;
      const realEnd  = (eIdx + eOff) * monthW;
      const w = Math.max(realEnd - rawStart, MIN_EVENT_WIDTH);
      // אותו clamp כמו eventStyle כדי שחישוב הנתיבים יתאים למיקום בפועל
      const start = Math.max(0, Math.min(rawStart, 100 - w));
      return { start, end: start + w };
    };
    for (const cat of visibleCats) {
      const catEvents = filteredEvents.filter(e => eventMatchesCat(e, cat.id));
      const sorted = [...catEvents].sort((a, b) => {
        const am = SCHOOL_YEAR_MONTHS.indexOf(a.startMonth);
        const bm = SCHOOL_YEAR_MONTHS.indexOf(b.startMonth);
        if (am !== bm) return am - bm;
        return (a.startDay || 1) - (b.startDay || 1);
      });
      const lanes: number[] = []; // endKey per lane
      const list: { ev: ViewEvent; lane: number }[] = [];
      for (const ev of sorted) {
        const { start: sKey, end: eKey } = boundsOf(ev);
        let lane = lanes.findIndex(end => end <= sKey);
        if (lane === -1) { lane = lanes.length; lanes.push(eKey); }
        else lanes[lane] = eKey;
        list.push({ ev, lane });
      }
      laned.set(cat.id, list);
      counts.set(cat.id, Math.max(1, lanes.length));
    }
    return { laned, counts };
  }, [visibleCats, filteredEvents]);

  const selectedEventData = selectedEvent ? allViewEvents.find(e => e.id === selectedEvent) : null;
  const selectedCats: DisplayCat[] = selectedEventData
    ? (selectedEventData.categoryIds && selectedEventData.categoryIds.length > 0
        ? selectedEventData.categoryIds
        : [selectedEventData.categoryId])
      .map(ec => allCats.find(c => c.id === ec))
      .filter((c): c is DisplayCat => !!c)
    : [];
  const selectedCat = selectedCats[0] ?? null;

  const myEvents     = allViewEvents.filter(e => {
    const cats = e.categoryIds && e.categoryIds.length > 0 ? e.categoryIds : [e.categoryId];
    return cats.some(ec => allCats.find(c => c.id === ec && (c.department === department || c.department === "both")));
  });
  const thisMonthEvs = myEvents.filter(e =>
    e.startMonth === new Date().getMonth() + 1 && eventSchoolYear(e) === defaultYear
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<"annual" | "monthly">("annual");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    if (mq.matches) setView("monthly");
    const handler = (e: MediaQueryListEvent) => setView(e.matches ? "monthly" : "annual");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const detailPanelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selectedEvent) {
      detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedEvent]);

  // ייבוא ICS
  const [showImport, setShowImport] = useState(false);
  const [importFileText, setImportFileText] = useState("");
  const [importFileName, setImportFileName] = useState("");

  async function handleIcsFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setImportFileText(text);
      setImportFileName(file.name);
      setShowImport(true);
    } catch (err) {
      toast("שגיאה בקריאת הקובץ: " + (err as Error).message, "error");
    } finally {
      e.target.value = "";
    }
  }

  async function handleIcsImport(payload: IcsImportPayload[]): Promise<{ ok: number; failed: number }> {
    if (payload.length === 0) return { ok: 0, failed: 0 };
    const results = await Promise.all(
      payload.map(p => createEvent(p).then(r => ({ payload: p, result: r })))
    );
    const successes = results.filter(x => !x.result.error);
    const failures = results.filter(x => x.result.error);
    successes.forEach(s => {
      logAudit({
        user_name: user?.full_name ?? null,
        event_id: s.result.data?.id ?? null,
        event_name: s.payload.name,
        action: "create",
        department: department,
      }).catch(() => {});
    });
    if (successes.length > 0) {
      toast(
        `יובאו ${successes.length} אירועים${failures.length ? ` (${failures.length} נכשלו)` : ""} ✨`,
        failures.length ? "warning" : "success",
      );
      getEvents().then(setDbEvents);
    } else if (failures.length > 0) {
      toast(`כל ${failures.length} האירועים נכשלו בייבוא`, "error");
    }
    return { ok: successes.length, failed: failures.length };
  }

  function ymdToDate(year: number | null | undefined, month: number, day: number): string {
    const y = year ?? (month >= 9 ? defaultYear : defaultYear + 1);
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  function dateToYMD(dateStr: string): { year: number; month: number; day: number } {
    const [y, m, d] = dateStr.split("-").map(Number);
    return { year: y, month: m, day: d };
  }

  const today = new Date().toISOString().slice(0, 10);
  const [newEvent, setNewEvent] = useState<{
    name: string;
    categoryIds: string[];
    startDate: string; endDate: string;
    startTime: string; endTime: string;
    ageGroups: string; location: string; responsible: string;
    description: string;
    imageUrl: string;
  }>({
    name: "", categoryIds: [],
    startDate: today, endDate: today,
    startTime: "", endTime: "",
    ageGroups: "", location: "", responsible: "",
    description: "",
    imageUrl: "",
  });
  const [uploadingPoster, setUploadingPoster] = useState(false);

  async function handlePosterFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPoster(true);
    const { url, error } = await uploadEventPoster(file);
    setUploadingPoster(false);
    e.target.value = "";
    if (error || !url) { toast("שגיאה בהעלאת הפוסטר: " + (error ?? ""), "error"); return; }
    setNewEvent(prev => ({ ...prev, imageUrl: url }));
  }

  // יצירת תשתית inline בתוך טופס האירוע
  const [showInfraInline, setShowInfraInline] = useState(false);
  const [newInfra, setNewInfra] = useState<{ name: string; type: string; address: string; capacity: string }>({
    name: "", type: "אולם", address: "", capacity: "",
  });
  const [savingInfra, setSavingInfra] = useState(false);

  async function handleCreateInfrastructureInline() {
    if (!newInfra.name.trim()) return;
    setSavingInfra(true);
    const { data, error } = await createInfrastructure({
      name: newInfra.name.trim(),
      type: newInfra.type,
      address: newInfra.address.trim() || null,
      capacity: newInfra.capacity ? Number(newInfra.capacity) : null,
      active: true,
    });
    setSavingInfra(false);
    if (error) { toast("שגיאה ביצירת תשתית: " + error.message, "error"); return; }
    const refreshed = await getInfrastructures();
    setInfrastructures(refreshed);
    if (data) {
      setNewEvent(prev => ({ ...prev, location: data.name }));
    }
    setNewInfra({ name: "", type: "אולם", address: "", capacity: "" });
    setShowInfraInline(false);
    toast("התשתית נוספה למאגר ✨", "success");
  }

  function startEdit(ev: ViewEvent) {
    const startDay  = ev.startDay  ?? 1;
    const endDay    = ev.endDay    ?? startDay;
    const startYear = (ev as ViewEvent & { startYear?: number | null }).startYear ?? null;
    const endYear   = (ev as ViewEvent & { endYear?: number | null }).endYear   ?? null;
    const startTime = (ev.startTime ?? "").slice(0, 5);
    const endTime   = (ev.endTime   ?? "").slice(0, 5);
    const cats = ev.categoryIds && ev.categoryIds.length > 0 ? ev.categoryIds : [ev.categoryId];
    setEditingId(ev.id);
    setNewEvent({
      name:        ev.name,
      categoryIds: cats,
      startDate:   ymdToDate(startYear, ev.startMonth, startDay),
      endDate:     ymdToDate(endYear,   ev.endMonth,   endDay),
      startTime,
      endTime,
      ageGroups:   ev.ageGroups.join(", "),
      location:    ev.location ?? "",
      responsible: ev.responsible ?? "",
      description: ev.description ?? "",
      imageUrl:    ev.imageUrl ?? "",
    });
    setShowNewEvent(true);
    setSelectedEvent(null);
  }

  useEffect(() => {
    // ברירת מחדל רק כשהטופס סגור — לא לדרוס בחירה של המשתמש בתוך הטופס
    if (!showNewEvent && myCategories.length && newEvent.categoryIds.length === 0) {
      setNewEvent(p => ({ ...p, categoryIds: [myCategories[0].id] }));
    }
  }, [myCategories, newEvent.categoryIds.length, showNewEvent]);

  async function handleCreateEvent(skipConflictCheck = false) {
    if (!newEvent.startDate) { toast("יש לבחור תאריך התחלה", "error"); return; }
    const endDateStr = newEvent.endDate && newEvent.endDate >= newEvent.startDate
      ? newEvent.endDate
      : newEvent.startDate;
    const start = dateToYMD(newEvent.startDate);
    const end   = dateToYMD(endDateStr);

    if (!editingId && !skipConflictCheck) {
      // השוואה לפי סדר שנת לימודים (ספט→אוג) ברמת יום, רק מול אירועים באותה שנה
      const newSchoolYear = start.month >= 9 ? start.year : start.year - 1;
      const posKey = (m: number, d: number) => SCHOOL_YEAR_MONTHS.indexOf(m) * 32 + d;
      const endOfYear = posKey(8, 31);
      const newStart = posKey(start.month, start.day);
      const newEnd   = Math.max(newStart, Math.min(posKey(end.month, end.day), endOfYear));
      const conflicts = allViewEvents.filter(e => {
        if (eventSchoolYear(e) !== newSchoolYear) return false;
        const evStart = posKey(e.startMonth, e.startDay || 1);
        let evEnd = posKey(e.endMonth, e.endDay || DAYS_IN_MONTH[e.endMonth] || 31);
        if (evEnd < evStart) evEnd = endOfYear;
        return evStart <= newEnd && evEnd >= newStart;
      }).map(e => e.name);
      if (conflicts.length > 0) { setConflictWarning(conflicts.slice(0, 3)); return; }
    }
    setCreating(true);
    const payload = {
      name:         newEvent.name.trim(),
      category_ids: newEvent.categoryIds,
      start_month:  start.month,
      end_month:    end.month,
      start_day:    start.day,
      end_day:      end.day,
      start_year:   start.year,
      end_year:     end.year,
      start_time:   newEvent.startTime || null,
      end_time:     newEvent.endTime || null,
      age_groups:   newEvent.ageGroups ? newEvent.ageGroups.split(",").map(s => s.trim()).filter(Boolean) : [],
      location:     newEvent.location || null,
      responsible:  newEvent.responsible || null,
      description:  newEvent.description || null,
      image_url:    newEvent.imageUrl || null,
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
    setNewEvent({ name: "", categoryIds: myCategories[0]?.id ? [myCategories[0].id] : [], startDate: today, endDate: today, startTime: "", endTime: "", ageGroups: "", location: "", responsible: "", description: "", imageUrl: "" });
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

      {/* סרגל עליון V3 */}
      <TopBar
        variant={department === "education" ? "edu" : "youth"}
        title={cfg.label}
        subtitle={department === "education" ? "EDUCATION · GANTT" : "YOUTH · GANTT"}
        rightContent={
          <>
            {user && (
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 600,
                }}>{user.full_name[0]}</span>
                {user.full_name}
              </span>
            )}
            <button onClick={handleLogout} style={{
              background: "rgba(255,255,255,0.18)", color: "#fff",
              border: "none", padding: "6px 12px", fontSize: 11,
              borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
            }}>
              יציאה
            </button>
          </>
        }
      />

      <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>

        {/* Hero Banner */}
        <div style={{
          background: `linear-gradient(135deg, ${cfg.primary} 0%, ${cfg.primaryDark} 100%)`,
          borderRadius: 20, padding: "1.5rem 1.75rem",
          marginBottom: 16, display: "flex", alignItems: "center",
          justifyContent: "space-between", flexWrap: "wrap", gap: 14,
          position: "relative", overflow: "hidden",
          boxShadow: `0 8px 32px ${cfg.primary}55`,
        }}>
          {/* עיגולי רקע דקורטיביים */}
          <div style={{ position: "absolute", top: -30, left: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <div style={{ position: "absolute", bottom: -40, left: 80, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ position: "absolute", top: 10, left: 160, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />

          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginBottom: 4, fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
              {user?.full_name ? `שלום, ${user.full_name}` : "ברוכים הבאים"} · {new Date().toLocaleDateString("he-IL", { weekday: "long" })}
            </div>
            <h1 className="disp" style={{ fontSize: 30, margin: "0 0 6px", color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
              גאנט {SCHOOL_YEARS.find(y => y.id === schoolYear)?.label.split(" ")[0] || "השנה"}
            </h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: 0 }}>
              {cfg.label} — לחץ על אירוע כדי לערוך
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, position: "relative", flexWrap: "wrap" }}>
            {[
              { label: "אירועים", value: myEvents.length },
              { label: "החודש",  value: thisMonthEvs.length },
              { label: "סה״כ",   value: allViewEvents.length },
            ].map(s => (
              <div key={s.label} style={{
                textAlign: "center",
                background: "rgba(255,255,255,0.18)",
                backdropFilter: "blur(8px)",
                borderRadius: 14, padding: "10px 18px",
                border: "1px solid rgba(255,255,255,0.25)",
                minWidth: 64,
              }}>
                <div className="num" style={{ fontSize: 24, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{s.value}</div>
                <div style={{ marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-mono)" }}>{s.label}</div>
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

          <input
            id={`ics-upload-${department}`}
            type="file"
            accept=".ics,text/calendar"
            onChange={handleIcsFileChange}
            style={{ display: "none" }}
          />
          <button
            onClick={() => document.getElementById(`ics-upload-${department}`)?.click()}
            disabled={!dbReady}
            title={!dbReady ? "טוען נתונים..." : "העלה קובץ ICS לסנכרון אירועים"}
            style={{
              background: "#fff", color: dbReady ? cfg.primaryDark : "var(--text-tertiary)",
              border: `1px solid ${dbReady ? cfg.light : "var(--border)"}`,
              padding: "8px 14px",
              borderRadius: "var(--radius-md)", fontSize: 13,
              fontWeight: 500, cursor: dbReady ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "inherit",
            }}
          >
            📅 ייבוא ICS
          </button>

          {/* בורר שנת לימודים בולט */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 11, color: "var(--text-secondary)", fontWeight: 500,
              userSelect: "none",
            }}>
              📅 שנת לימודים:
            </span>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: cfg.lighter, padding: "4px",
              borderRadius: 10, border: `1px solid ${cfg.light}`,
            }}>
              {SCHOOL_YEARS.map(y => (
                <button key={y.id} onClick={() => setSchoolYear(y.id)} style={{
                  padding: "5px 10px", fontSize: 12, fontWeight: 500,
                  background: schoolYear === y.id ? cfg.primary : "transparent",
                  color:      schoolYear === y.id ? "#fff" : cfg.primaryDark,
                  border: "none", borderRadius: 7,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}>
                  {y.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

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
            {([
              { id: "all", label: "הכל" },
              { id: "education", label: "חינוך" },
              { id: "youth", label: "נוער" },
            ] as const).map(f => (
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

          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 חיפוש אירוע, אחראי או מיקום..."
              style={{
                width: "100%", padding: "8px 12px 8px 30px", fontSize: 13,
                border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                background: "#fff", fontFamily: "inherit", outline: "none",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{
                position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                width: 20, height: 20, borderRadius: "50%",
                background: "var(--bg-secondary)", border: "none",
                cursor: "pointer", fontSize: 12, color: "var(--text-tertiary)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>×</button>
            )}
          </div>

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

        {/* אירועים קרובים — Quick View */}
        {(() => {
          const t = new Date();
          const tMonth = t.getMonth() + 1;
          const nextMonth = (tMonth % 12) + 1;
          const upcoming = filteredEvents
            .filter(e => {
              if (e.startMonth !== tMonth && e.startMonth !== nextMonth) return false;
              // אירוע החודש שכבר הסתיים — לא "קרוב"
              if (e.startMonth === tMonth && e.endMonth === e.startMonth) {
                const endsOn = e.endDay ?? e.startDay ?? 31;
                if (endsOn < t.getDate()) return false;
              }
              return true;
            })
            .sort((a, b) => {
              const am = SCHOOL_YEAR_MONTHS.indexOf(a.startMonth);
              const bm = SCHOOL_YEAR_MONTHS.indexOf(b.startMonth);
              if (am !== bm) return am - bm;
              return (a.startDay || 1) - (b.startDay || 1);
            })
            .slice(0, 5);
          if (upcoming.length === 0) return null;
          return (
            <div style={{
              background: "#fff", border: "0.5px solid var(--line)",
              borderRadius: 12, padding: "12px 14px", marginBottom: 12,
              display: "flex", alignItems: "center", gap: 10, overflowX: "auto",
            }} className="no-scrollbar">
              <span className="eyebrow" style={{ flexShrink: 0, fontSize: 9 }}>
                ⚡ אירועים קרובים
              </span>
              {upcoming.map(ev => {
                const cat = allCats.find(c => c.id === ev.categoryId);
                return (
                  <button key={ev.id} onClick={() => setSelectedEvent(ev.id)} style={{
                    flexShrink: 0, padding: "5px 10px", fontSize: 11,
                    border: `1px solid ${cat?.color || cfg.primary}33`,
                    background: `${cat?.color || cfg.primary}11`,
                    color: cat?.color || cfg.primaryDark, fontWeight: 500,
                    borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap",
                    fontFamily: "inherit",
                  }}>
                    <span className="num" style={{ marginLeft: 4 }}>
                      {ev.startDay || 1}/{ev.startMonth}
                    </span>
                    {ev.name}
                  </button>
                );
              })}
            </div>
          );
        })()}

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
                  startYear: e.startYear, endYear: e.endYear,
                  color: cat?.color || "#888",
                  ageGroups: e.ageGroups, location: e.location,
                };
              })}
              onEventClick={id => setSelectedEvent(id)}
              onDayClick={(month, day) => {
                const year = month >= 9 ? schoolYear : schoolYear + 1;
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
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: 16 }}>
        <div style={{ minWidth: 900 }}>

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
            const isMyDept = cat.department === department || cat.department === "both";
            const laneCount = lanesByCat.counts.get(cat.id) || 1;
            const rowHeight = Math.max(44, 12 + laneCount * 26);
            return (
              <div key={cat.id} style={{
                display: "grid", gridTemplateColumns: "120px repeat(12, 1fr)",
                borderBottom: "0.5px solid var(--border)", minHeight: rowHeight,
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
                  {cat.department === "both" && <span style={{ fontSize: 9, color: "var(--text-tertiary)", marginRight: 2 }}>
                    (משותף)
                  </span>}
                  {!isMyDept && <span style={{ fontSize: 9, color: "var(--text-tertiary)", marginRight: 2 }}>
                    ({cat.department === "education" ? "חינוך" : "נוער"})
                  </span>}
                </div>
                <div style={{ gridColumn: "2 / -1", display: "grid", gridTemplateColumns: "repeat(12, 1fr)", position: "relative" }}>
                  {SCHOOL_YEAR_MONTHS.map((_, i) => (
                    <div key={i} style={{ borderRight: i < 11 ? "0.5px solid var(--border)" : "none" }} />
                  ))}
                  {(lanesByCat.laned.get(cat.id) || []).map(({ ev, lane }) => {
                    const style = eventStyle(ev.startMonth, ev.endMonth, isMyDept ? cat.color : cat.color + "88", ev.startDay, ev.endDay);
                    if (!style) return null;
                    const top = 6 + lane * 26;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(selectedEvent === ev.id ? null : ev.id)}
                        title={`${ev.name}${ev.startDay ? ` · ${ev.startDay}/${ev.startMonth}` : ""}${ev.endDay && (ev.endDay !== ev.startDay || ev.endMonth !== ev.startMonth) ? `–${ev.endDay}/${ev.endMonth}` : ""}`}
                        style={{
                          position: "absolute", top, height: 22,
                          borderRadius: 4, padding: "2px 6px",
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
        </div>
        )}

        {/* פרטי אירוע שנבחר */}
        {selectedEventData && (
          <div ref={detailPanelRef} style={{
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
              {selectedCats.map(cat => (
                <span key={cat.id} style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 10,
                  background: cat.color + "22", color: cat.color,
                }}>
                  {cat.name}
                </span>
              ))}
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
              {(selectedEventData.startTime || selectedEventData.endTime) && (
                <span>🕐 {selectedEventData.startTime ? selectedEventData.startTime.slice(0,5) : ""}
                  {selectedEventData.endTime ? ` – ${selectedEventData.endTime.slice(0,5)}` : ""}
                </span>
              )}
              {selectedEventData.location   && <span>📍 {selectedEventData.location}</span>}
              {selectedEventData.responsible && <span>👤 {selectedEventData.responsible}</span>}
              {selectedEventData.ageGroups.length > 0 && <span>👥 {selectedEventData.ageGroups.join(", ")}</span>}
            </div>
            {selectedEventData.description && (
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 14px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {selectedEventData.description}
              </p>
            )}
            {selectedEventData.imageUrl && (
              <img
                src={selectedEventData.imageUrl}
                alt="פוסטר האירוע"
                style={{
                  maxWidth: "100%", maxHeight: 260,
                  objectFit: "contain", borderRadius: "var(--radius-md)",
                  marginBottom: 14, display: "block",
                }}
              />
            )}
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
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          zIndex: 100, padding: "0 0 0 0",
          animation: "fadeIn 0.18s ease",
        }} onClick={e => { if (e.target === e.currentTarget) { setShowNewEvent(false); setConflictWarning(null); setEditingId(null); }}}>
          <div style={{
            background: "#fff",
            borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
            padding: "1.75rem", width: "100%", maxWidth: 520,
            boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
            position: "relative",
            animation: "slideUp 0.22s cubic-bezier(0.2,0.8,0.2,1)",
            maxHeight: "92dvh", overflowY: "auto",
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
              {/* שם האירוע */}
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>שם האירוע *</label>
                <input
                  value={newEvent.name}
                  onChange={e => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="למשל: יום פתוח גנים"
                  style={{ width: "100%", padding: "8px 11px", fontSize: 13, border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)", fontFamily: "inherit", outline: "none" }}
                />
              </div>

              {/* תיאור — מיד אחרי השם */}
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  תיאור האירוע
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="כמה מילים על האירוע, מטרות, פרטים נוספים..."
                  rows={3}
                  style={{
                    width: "100%", padding: "8px 11px", fontSize: 13,
                    border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                    fontFamily: "inherit", outline: "none", resize: "vertical",
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {[
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

              {/* פוסטר האירוע */}
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  פוסטר האירוע (אופציונלי)
                </label>
                {newEvent.imageUrl ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={newEvent.imageUrl} alt="פוסטר" style={{
                      width: 64, height: 64, objectFit: "cover",
                      borderRadius: "var(--radius-md)", border: "0.5px solid var(--border)",
                    }} />
                    <button
                      type="button"
                      onClick={() => setNewEvent(prev => ({ ...prev, imageUrl: "" }))}
                      style={{
                        fontSize: 12, color: "var(--danger)", background: "transparent",
                        border: "none", cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      ✕ הסר פוסטר
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      id={`poster-upload-${department}`}
                      type="file"
                      accept="image/*"
                      onChange={handlePosterFileChange}
                      style={{ display: "none" }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById(`poster-upload-${department}`)?.click()}
                      disabled={uploadingPoster}
                      style={{
                        width: "100%", padding: "10px", fontSize: 12.5, fontWeight: 500,
                        border: `1.5px dashed ${cfg.light}`, borderRadius: "var(--radius-md)",
                        background: cfg.lighter, color: cfg.primaryDark,
                        cursor: uploadingPoster ? "not-allowed" : "pointer", fontFamily: "inherit",
                      }}
                    >
                      {uploadingPoster ? "מעלה..." : "🖼️ העלאת פוסטר"}
                    </button>
                  </>
                )}
              </div>

              {/* שדה מיקום: בחירה מהמאגר + טקסט חופשי + יצירת תשתית inline */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    מיקום
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowInfraInline(v => !v)}
                    style={{
                      background: "transparent", border: "none",
                      color: cfg.primary, fontSize: 11, fontWeight: 500,
                      cursor: "pointer", padding: "2px 6px",
                      fontFamily: "inherit",
                    }}
                  >
                    {showInfraInline ? "× סגור" : "+ צור תשתית חדשה"}
                  </button>
                </div>
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

                {/* תת-טופס: יצירת תשתית חדשה */}
                {showInfraInline && (
                  <div style={{
                    marginTop: 10, padding: "12px",
                    background: cfg.lighter, borderRadius: "var(--radius-md)",
                    border: `1px solid ${cfg.light}`,
                    display: "flex", flexDirection: "column", gap: 8,
                  }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: cfg.primaryDark }}>
                      🏛 תשתית חדשה למאגר העירוני
                    </p>
                    <input
                      value={newInfra.name}
                      onChange={e => setNewInfra(p => ({ ...p, name: e.target.value }))}
                      placeholder="שם המקום *"
                      style={{
                        padding: "7px 10px", fontSize: 12,
                        border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                        fontFamily: "inherit", outline: "none", background: "#fff",
                      }}
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <select
                        value={newInfra.type}
                        onChange={e => setNewInfra(p => ({ ...p, type: e.target.value }))}
                        style={{
                          padding: "7px 10px", fontSize: 12,
                          border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                          fontFamily: "inherit", background: "#fff", outline: "none",
                        }}
                      >
                        {INFRA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input
                        type="number"
                        value={newInfra.capacity}
                        onChange={e => setNewInfra(p => ({ ...p, capacity: e.target.value }))}
                        placeholder="קיבולת"
                        style={{
                          padding: "7px 10px", fontSize: 12,
                          border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                          fontFamily: "inherit", outline: "none", background: "#fff",
                        }}
                      />
                    </div>
                    <input
                      value={newInfra.address}
                      onChange={e => setNewInfra(p => ({ ...p, address: e.target.value }))}
                      placeholder="כתובת (אופציונלי)"
                      style={{
                        padding: "7px 10px", fontSize: 12,
                        border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                        fontFamily: "inherit", outline: "none", background: "#fff",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateInfrastructureInline}
                      disabled={!newInfra.name.trim() || savingInfra}
                      style={{
                        padding: "7px", fontSize: 12, fontWeight: 500,
                        background: newInfra.name.trim() ? cfg.primary : "var(--bg-secondary)",
                        color: newInfra.name.trim() ? "#fff" : "var(--text-tertiary)",
                        border: "none", borderRadius: "var(--radius-md)",
                        cursor: newInfra.name.trim() ? "pointer" : "not-allowed",
                        fontFamily: "inherit",
                      }}
                    >
                      {savingInfra ? "שומר..." : "שמור תשתית והשתמש"}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  תחומים * (ניתן לבחור יותר מאחד)
                </label>
                <div style={{
                  border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                  background: "#fff", padding: 6, maxHeight: 180, overflowY: "auto",
                  display: "flex", flexDirection: "column", gap: 2,
                }}>
                  {myCategories.map(cat => {
                    const checked = newEvent.categoryIds.includes(cat.id);
                    return (
                      <label key={cat.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 8px", borderRadius: 6,
                        cursor: "pointer", fontSize: 13,
                        background: checked ? cat.color + "18" : "transparent",
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => setNewEvent(prev => {
                            const next = e.target.checked
                              ? [...prev.categoryIds, cat.id]
                              : prev.categoryIds.filter(id => id !== cat.id);
                            return { ...prev, categoryIds: next };
                          })}
                          style={{ accentColor: cat.color }}
                        />
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                        <span>{cat.name}</span>
                        {cat.department === "both" && (
                          <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginRight: "auto" }}>משותף</span>
                        )}
                      </label>
                    );
                  })}
                </div>
                {newEvent.categoryIds.length === 0 && (
                  <p style={{ fontSize: 11, color: "var(--danger)", margin: "4px 0 0" }}>
                    יש לבחור לפחות תחום אחד
                  </p>
                )}
                {newEvent.categoryIds.length > 1 && (
                  <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "4px 0 0" }}>
                    האירוע יופיע ב-{newEvent.categoryIds.length} שורות בגאנט
                  </p>
                )}
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

              {/* שעות (אופציונלי) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    שעת התחלה
                  </label>
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={e => setNewEvent(prev => ({
                      ...prev,
                      startTime: e.target.value,
                      endTime: prev.endTime && prev.endTime < e.target.value ? e.target.value : prev.endTime,
                    }))}
                    style={{
                      width: "100%", padding: "8px 11px", fontSize: 13,
                      border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                      fontFamily: "inherit", background: "#fff", outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    שעת סיום
                  </label>
                  <input
                    type="time"
                    value={newEvent.endTime}
                    min={newEvent.startTime || undefined}
                    onChange={e => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                    style={{
                      width: "100%", padding: "8px 11px", fontSize: 13,
                      border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                      fontFamily: "inherit", background: "#fff", outline: "none",
                    }}
                  />
                </div>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "-4px 0 0" }}>
                השעות אופציונליות — השאר ריק לאירוע כל-יומי
              </p>

              {!conflictWarning && (() => {
                const canSave = !!newEvent.name.trim() && newEvent.categoryIds.length > 0;
                return (
                  <button
                    onClick={() => handleCreateEvent(false)}
                    disabled={!canSave || creating}
                    style={{
                      marginTop: 4, padding: "10px 0", fontSize: 14, fontWeight: 500,
                      background: canSave ? cfg.primary : "var(--bg-secondary)",
                      color: canSave ? "#fff" : "var(--text-tertiary)",
                      border: "none", borderRadius: "var(--radius-md)", cursor: canSave ? "pointer" : "not-allowed",
                      width: "100%",
                    }}
                  >
                    {creating ? "שומר..." : editingId ? "שמור שינויים" : "צור אירוע"}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <IcsImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        fileText={importFileText}
        fileName={importFileName}
        categories={myCategories}
        defaultCategoryId={myCategories[0]?.id ?? ""}
        onImport={handleIcsImport}
        primary={cfg.primary}
        primaryDark={cfg.primaryDark}
        lighter={cfg.lighter}
        light={cfg.light}
      />

      <BotChat />

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (max-width: 768px) {
          .hello-bar-stats { display: none !important; }
          .gantt-desktop-only { display: none !important; }
        }
      `}</style>
    </div>
  );
}
