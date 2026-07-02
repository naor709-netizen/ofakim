"use client";

import { useState, useMemo, useEffect } from "react";
import { HOLIDAYS } from "@/lib/data";

interface MonthEvent {
  id: string;
  name: string;
  categoryId: string;
  startMonth: number;
  endMonth: number;
  startDay?: number | null;
  endDay?: number | null;
  startYear?: number | null;
  endYear?: number | null;
  color: string;
  ageGroups: string[];
  location?: string | null;
}

interface MonthlyViewProps {
  events: MonthEvent[];
  initialMonth?: number;
  initialYear?: number;
  onEventClick?: (id: string) => void;
  onDayClick?: (month: number, day: number) => void;
  primaryColor?: string;
}

const DAY_NAMES_HE = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "שבת"];
const MONTH_NAMES_FULL = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

// שנת הלימודים הנוכחית (שנת הספטמבר שלה) — fallback לאירועים ללא שנה
function currentSchoolYear(): number {
  const t = new Date();
  return t.getMonth() + 1 >= 9 ? t.getFullYear() : t.getFullYear() - 1;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

// תרגום מחודש+שנה לתאריך עברי תקני (תשפ"ה / תשפ"ו / תשפ"ז)
function getSchoolYearLabel(year: number, month: number): string {
  const sy = month >= 9 ? year : year - 1;
  if (sy === 2024) return "תשפ״ה";
  if (sy === 2025) return "תשפ״ו";
  if (sy === 2026) return "תשפ״ז";
  return `${sy}-${sy + 1}`;
}

export default function MonthlyView({
  events,
  initialMonth,
  initialYear,
  onEventClick,
  onDayClick,
  primaryColor = "var(--parent-primary)",
}: MonthlyViewProps) {
  // ברירת מחדל: היום הנוכחי
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(initialMonth ?? today.getMonth() + 1);
  const [currentYear, setCurrentYear]   = useState(initialYear  ?? today.getFullYear());
  // יום שנפתח בחלון "כל האירועים" (כשיש יותר מדי אירועים ביום אחד)
  const [dayModal, setDayModal] = useState<number | null>(null);

  // עדכון אם props משתנים
  useEffect(() => {
    if (initialMonth !== undefined) setCurrentMonth(initialMonth);
    if (initialYear  !== undefined) setCurrentYear(initialYear);
  }, [initialMonth, initialYear]);

  const monthLabel  = MONTH_NAMES_FULL[currentMonth - 1];
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay    = getFirstDayOfMonth(currentYear, currentMonth);

  const monthHolidays = useMemo(() =>
    HOLIDAYS.filter(h => h.month === currentMonth)
  , [currentMonth]);

  function eventsForDay(day: number): MonthEvent[] {
    return events.filter(e => {
      // בדוק התאמת שנה - אם יש startYear/endYear
      const sy = currentSchoolYear();
      const evStartYear = e.startYear ?? (e.startMonth >= 9 ? sy : sy + 1);
      const evEndYear   = e.endYear   ?? (e.endMonth   >= 9 ? sy : sy + 1);

      if (e.startMonth === currentMonth && e.endMonth === currentMonth) {
        if (evStartYear !== currentYear) return false;
        const sd = e.startDay || 1;
        const ed = e.endDay   || sd;
        return day >= sd && day <= ed;
      }
      if (e.startMonth === currentMonth) {
        if (evStartYear !== currentYear) return false;
        const sd = e.startDay || 1;
        return day >= sd;
      }
      if (e.endMonth === currentMonth) {
        if (evEndYear !== currentYear) return false;
        const ed = e.endDay || daysInMonth;
        return day <= ed;
      }
      // חודש ביניים
      const beforeEnd = (currentYear < evEndYear) ||
                        (currentYear === evEndYear && currentMonth < e.endMonth);
      const afterStart = (currentYear > evStartYear) ||
                         (currentYear === evStartYear && currentMonth > e.startMonth);
      return beforeEnd && afterStart;
    });
  }

  function holidayForDay(day: number) {
    return monthHolidays.find(h => {
      const start = h.day;
      const end   = h.day + (h.duration ?? 1) - 1;
      return day >= start && day <= end;
    });
  }

  function navigateMonth(dir: -1 | 1) {
    let newMonth = currentMonth + dir;
    let newYear  = currentYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  }

  function goToToday() {
    const t = new Date();
    setCurrentMonth(t.getMonth() + 1);
    setCurrentYear(t.getFullYear());
  }

  // בניית מערך תאים
  const cells: ({ day: number } | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push(null);

  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth;
  const todayDay = isCurrentMonth ? today.getDate() : -1;
  const schoolYearLabel = getSchoolYearLabel(currentYear, currentMonth);

  // 12 חודשים אחורה ו-12 קדימה לבחירה מהירה
  const monthOptions = useMemo(() => {
    const opts: { month: number; year: number; label: string }[] = [];
    for (let i = -6; i <= 18; i++) {
      let m = today.getMonth() + 1 + i;
      let y = today.getFullYear();
      while (m > 12) { m -= 12; y += 1; }
      while (m < 1)  { m += 12; y -= 1; }
      opts.push({ month: m, year: y, label: `${MONTH_NAMES_FULL[m - 1]} ${y}` });
    }
    return opts;
  }, []);

  return (
    <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", border: "0.5px solid var(--border)", overflow: "hidden" }}>

      {/* ניווט חודשים */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", background: "var(--bg-secondary)",
        borderBottom: "0.5px solid var(--border)", gap: 8, flexWrap: "wrap",
      }}>
        <button onClick={() => navigateMonth(-1)} style={navBtnStyle}>→ קודם</button>

        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
            {monthLabel} {currentYear}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
            שנת לימודים {schoolYearLabel}
            {monthHolidays.length > 0 && ` · ${monthHolidays.map(h => h.name).join(" · ")}`}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={goToToday} style={{
            ...navBtnStyle,
            background: primaryColor, color: "#fff", borderColor: primaryColor,
          }}>היום</button>
          <button onClick={() => navigateMonth(1)} style={navBtnStyle}>הבא ←</button>
        </div>
      </div>

      {/* בורר חודש מהיר (12 חודשים אחורה ו-18 קדימה) */}
      <div style={{
        display: "flex", gap: 4, padding: "8px 12px",
        overflowX: "auto", borderBottom: "0.5px solid var(--border)",
        background: "#fff",
      }}>
        {monthOptions.map(opt => {
          const active = opt.month === currentMonth && opt.year === currentYear;
          return (
            <button key={`${opt.year}-${opt.month}`}
              onClick={() => { setCurrentMonth(opt.month); setCurrentYear(opt.year); }}
              style={{
                padding: "5px 12px", fontSize: 11, borderRadius: 12,
                border: "none", cursor: "pointer", whiteSpace: "nowrap",
                background: active ? primaryColor : "transparent",
                color:      active ? "#fff" : "var(--text-secondary)",
                fontWeight: active ? 500 : 400,
                fontFamily: "inherit",
              }}>
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* כותרת ימי שבוע */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "var(--bg-secondary)", borderBottom: "0.5px solid var(--border)" }}>
        {DAY_NAMES_HE.map((d, i) => (
          <div key={d} style={{
            padding: "8px 4px", textAlign: "center",
            fontSize: 11, fontWeight: 500,
            color: i === 6 ? primaryColor : "var(--text-secondary)",
            borderLeft: i < 6 ? "0.5px solid var(--border)" : "none",
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* רשת התאריכים */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map((cell, i) => {
          if (!cell) {
            return (
              <div key={`empty-${i}`} style={{
                minHeight: 92, background: "#fafaf7",
                borderLeft: i % 7 < 6 ? "0.5px solid var(--border)" : "none",
                borderTop: "0.5px solid var(--border)",
              }} />
            );
          }
          const dayEvents = eventsForDay(cell.day);
          const holiday   = holidayForDay(cell.day);
          const isToday   = cell.day === todayDay;
          const dayOfWeek = (firstDay + cell.day - 1) % 7;
          const isSaturday= dayOfWeek === 6;

          return (
            <div
              key={cell.day}
              onClick={() => onDayClick?.(currentMonth, cell.day)}
              style={{
                minHeight: 92, padding: "5px 6px",
                position: "relative",
                background: holiday?.type === "holiday" ? "#FFFBEB"
                          : holiday?.type === "vacation" ? "#FEF3C7"
                          : holiday?.type === "memorial" ? "#F3F4F6"
                          : isSaturday ? "#FAFAF7" : "#fff",
                borderLeft: i % 7 < 6 ? "0.5px solid var(--border)" : "none",
                borderTop: "0.5px solid var(--border)",
                cursor: onDayClick ? "pointer" : "default",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { if (onDayClick) e.currentTarget.style.background = "var(--bg-secondary)"; }}
              onMouseLeave={e => {
                e.currentTarget.style.background = holiday?.type === "holiday" ? "#FFFBEB"
                  : holiday?.type === "vacation" ? "#FEF3C7"
                  : holiday?.type === "memorial" ? "#F3F4F6"
                  : isSaturday ? "#FAFAF7" : "#fff";
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 4,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 500,
                  background: isToday ? primaryColor : "transparent",
                  color: isToday ? "#fff" : isSaturday ? primaryColor : "var(--text-primary)",
                }}>
                  {cell.day}
                </span>
                {holiday && (
                  <span style={{
                    fontSize: 9, padding: "1px 5px", borderRadius: 3,
                    background: "#FDE68A", color: "#78350F",
                    maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {holiday.name}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {dayEvents.slice(0, 3).map(ev => (
                  <button
                    key={ev.id}
                    onClick={e => { e.stopPropagation(); onEventClick?.(ev.id); }}
                    title={ev.name}
                    style={{
                      fontSize: 9, fontWeight: 500,
                      padding: "2px 5px", borderRadius: 3,
                      background: ev.color, color: "#fff",
                      border: "none", cursor: "pointer",
                      textAlign: "right",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}
                  >
                    {ev.name}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <button
                    onClick={e => { e.stopPropagation(); setDayModal(cell.day); }}
                    style={{
                      fontSize: 9, fontWeight: 600, color: primaryColor,
                      paddingRight: 4, background: "none", border: "none",
                      cursor: "pointer", textAlign: "right", fontFamily: "inherit",
                    }}
                  >
                    +{dayEvents.length - 3} עוד
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* חלון כל אירועי היום */}
      {dayModal !== null && (
        <div
          onClick={() => setDayModal(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 200, padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: "var(--radius-lg)",
              padding: "1.25rem", width: "100%", maxWidth: 380,
              maxHeight: "80vh", overflowY: "auto", position: "relative",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                {dayModal} ב{monthLabel} · {eventsForDay(dayModal).length} אירועים
              </h3>
              <button
                onClick={() => setDayModal(null)}
                style={{
                  width: 28, height: 28, border: "none", background: "var(--bg-secondary)",
                  borderRadius: "50%", cursor: "pointer", fontSize: 16, flexShrink: 0,
                }}
              >×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {eventsForDay(dayModal).map(ev => (
                <button
                  key={ev.id}
                  onClick={() => { onEventClick?.(ev.id); setDayModal(null); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 11px", borderRadius: 8,
                    background: "var(--bg-secondary)", border: "none",
                    cursor: "pointer", textAlign: "right", fontFamily: "inherit",
                    fontSize: 13, color: "var(--text-primary)", width: "100%",
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: ev.color, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{ev.name}</span>
                  {ev.location && <span style={{ fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0 }}>📍 {ev.location}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  padding: "6px 14px", fontSize: 12, fontFamily: "inherit",
  border: "0.5px solid var(--border)", background: "#fff",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
  color: "var(--text-secondary)",
};
