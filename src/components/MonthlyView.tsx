"use client";

import { useState, useMemo } from "react";
import { MONTHS_HE, SCHOOL_YEAR_MONTHS, HOLIDAYS } from "@/lib/data";

interface MonthEvent {
  id: string;
  name: string;
  categoryId: string;
  startMonth: number;
  endMonth: number;
  startDay?: number | null;
  endDay?: number | null;
  color: string;
  ageGroups: string[];
  location?: string | null;
}

interface MonthlyViewProps {
  events: MonthEvent[];
  initialMonth?: number;
  onEventClick?: (id: string) => void;
  onDayClick?: (month: number, day: number) => void;
  primaryColor?: string;
}

const DAY_NAMES_HE = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "שבת"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

export default function MonthlyView({
  events,
  initialMonth = 9,
  onEventClick,
  onDayClick,
  primaryColor = "var(--parent-primary)",
}: MonthlyViewProps) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  const monthIdx = SCHOOL_YEAR_MONTHS.indexOf(currentMonth);
  const monthLabel = MONTHS_HE[monthIdx];
  const year = currentMonth >= 9 ? 2025 : 2026;
  const daysInMonth = getDaysInMonth(year, currentMonth);
  const firstDay    = getFirstDayOfMonth(year, currentMonth);

  const monthHolidays = useMemo(() =>
    HOLIDAYS.filter(h => h.month === currentMonth)
  , [currentMonth]);

  function eventsForDay(day: number): MonthEvent[] {
    return events.filter(e => {
      // אירוע חופף ליום הזה
      if (e.startMonth === currentMonth && e.endMonth === currentMonth) {
        const sd = e.startDay || 1;
        const ed = e.endDay   || sd;
        return day >= sd && day <= ed;
      }
      if (e.startMonth === currentMonth) {
        const sd = e.startDay || 1;
        return day >= sd;
      }
      if (e.endMonth === currentMonth) {
        const ed = e.endDay || daysInMonth;
        return day <= ed;
      }
      // חודש ביניים באירוע רב-חודשי
      const inBetween = (() => {
        const startIdx = SCHOOL_YEAR_MONTHS.indexOf(e.startMonth);
        const endIdx   = SCHOOL_YEAR_MONTHS.indexOf(e.endMonth);
        return startIdx < monthIdx && monthIdx < endIdx;
      })();
      return inBetween;
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
    const newIdx = monthIdx + dir;
    if (newIdx < 0 || newIdx > 11) return;
    setCurrentMonth(SCHOOL_YEAR_MONTHS[newIdx]);
  }

  // בניית מערך תאים: cells יכלול ריבועים ריקים בתחילת החודש
  const cells: ({ day: number } | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  // השלמה לרשת מלאה
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === currentMonth;
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  return (
    <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", border: "0.5px solid var(--border)", overflow: "hidden" }}>

      {/* ניווט חודשים */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", background: "var(--bg-secondary)",
        borderBottom: "0.5px solid var(--border)",
      }}>
        <button
          onClick={() => navigateMonth(-1)}
          disabled={monthIdx === 0}
          style={navBtnStyle(monthIdx === 0)}
        >→ קודם</button>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
            {monthLabel} {year}
          </div>
          {monthHolidays.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
              {monthHolidays.map(h => h.name).join(" · ")}
            </div>
          )}
        </div>

        <button
          onClick={() => navigateMonth(1)}
          disabled={monthIdx === 11}
          style={navBtnStyle(monthIdx === 11)}
        >הבא ←</button>
      </div>

      {/* בורר חודשים מהיר */}
      <div style={{
        display: "flex", gap: 4, padding: "8px 12px",
        overflowX: "auto", borderBottom: "0.5px solid var(--border)",
        background: "#fff",
      }}>
        {SCHOOL_YEAR_MONTHS.map((m, i) => (
          <button key={m} onClick={() => setCurrentMonth(m)} style={{
            padding: "5px 12px", fontSize: 11, borderRadius: 12,
            border: "none", cursor: "pointer", whiteSpace: "nowrap",
            background: currentMonth === m ? primaryColor : "transparent",
            color:      currentMonth === m ? "#fff" : "var(--text-secondary)",
            fontWeight: currentMonth === m ? 500 : 400,
          }}>
            {MONTHS_HE[i]}
          </button>
        ))}
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

              {/* אירועים של היום */}
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
                  <span style={{ fontSize: 9, color: "var(--text-tertiary)", paddingRight: 4 }}>
                    +{dayEvents.length - 3} עוד
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "6px 14px", fontSize: 12, fontFamily: "inherit",
  border: "0.5px solid var(--border)", background: "#fff",
  borderRadius: "var(--radius-md)",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
  color: "var(--text-secondary)",
});
