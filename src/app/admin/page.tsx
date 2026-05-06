"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEMO_EVENTS, CATEGORIES, MONTHS_HE, SCHOOL_YEAR_MONTHS } from "@/lib/data";
import { getEvents, type DbEvent } from "@/lib/events";
import { getAuditLog, type AuditEntry } from "@/lib/infrastructure";
import { loadSession, clearSession, type AppUser } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { TopBar } from "@/components/v3/TopBar";

function exportToCSV(events: DbEvent[]) {
  const headers = ["שם האירוע", "תחום", "מחלקה", "תאריך התחלה", "תאריך סיום", "מיקום", "אחראי", "קהל יעד", "סטטוס"];
  const rows = events.map(e => [
    e.name,
    e.categories?.name || "",
    e.categories?.department === "education" ? "מנהל החינוך" : e.categories?.department === "youth" ? "מחלקת הנוער" : "",
    `${e.start_day || 1}/${e.start_month}/${e.start_year || 2025}`,
    `${e.end_day || 1}/${e.end_month}/${e.end_year || 2025}`,
    e.location || "",
    e.responsible || "",
    (e.age_groups || []).join(", "),
    e.status === "published" ? "מפורסם" : "טיוטה",
  ]);

  const csv = "﻿" + [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ofakim-events-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printEvents(events: DbEvent[]) {
  const html = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<title>אירועים - עיריית אופקים</title>
<style>
  body { font-family: 'Heebo', Arial, sans-serif; padding: 20px; direction: rtl; }
  h1 { color: #185FA5; border-bottom: 2px solid #185FA5; padding-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { padding: 8px 12px; text-align: right; border: 1px solid #ddd; font-size: 12px; }
  th { background: #f4f4f0; font-weight: 600; }
  .edu { color: #185FA5; }
  .youth { color: #D85A30; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
  <h1>📅 לוח אירועים — עיריית אופקים</h1>
  <p><strong>תאריך הדפסה:</strong> ${new Date().toLocaleDateString("he-IL")} · <strong>סה"כ אירועים:</strong> ${events.length}</p>
  <table>
    <thead>
      <tr>
        <th>שם</th><th>תחום</th><th>מחלקה</th><th>תאריך</th><th>מיקום</th><th>אחראי</th><th>קהל יעד</th>
      </tr>
    </thead>
    <tbody>
      ${events.map(e => `
        <tr>
          <td>${e.name}</td>
          <td>${e.categories?.name || ""}</td>
          <td class="${e.categories?.department === "education" ? "edu" : "youth"}">${e.categories?.department === "education" ? "חינוך" : "נוער"}</td>
          <td>${e.start_day || 1}/${e.start_month}${e.end_month !== e.start_month ? ` – ${e.end_day || 1}/${e.end_month}` : ""}</td>
          <td>${e.location || "—"}</td>
          <td>${e.responsible || "—"}</td>
          <td>${(e.age_groups || []).join(", ")}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
</body>
</html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}

const DEPT_COLORS = { education: "#185FA5", youth: "#D85A30" };

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<AppUser | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "log">("overview");
  const [dbEvents, setDbEvents] = useState<DbEvent[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  useEffect(() => {
    const session = loadSession();
    if (!session || session.role !== "admin") {
      router.push("/login");
      return;
    }
    setUser(session);
    getEvents().then(setDbEvents);
    getAuditLog(50).then(setAuditLog);
  }, [router]);

  // משלב את אירועי ה-DB עם ה-DEMO לסטטיסטיקות
  const events = dbEvents.length > 0 ? dbEvents.map(e => ({
    id: e.id, name: e.name,
    categoryId: e.categories?.name || e.category_id,
    startMonth: e.start_month, endMonth: e.end_month,
    department: e.categories?.department || null,
  })) : DEMO_EVENTS.map(e => {
    const cat = CATEGORIES.find(c => c.id === e.categoryId);
    return { id: e.id, name: e.name, categoryId: e.categoryId, startMonth: e.startMonth, endMonth: e.endMonth, department: cat?.department || null };
  });

  const totalEvents    = events.length;
  const educationCount = events.filter(e => e.department === "education").length;
  const youthCount     = events.filter(e => e.department === "youth").length;

  // אירועים לפי חודש
  const byMonth = SCHOOL_YEAR_MONTHS.map(m => ({
    month: m,
    label: MONTHS_HE[SCHOOL_YEAR_MONTHS.indexOf(m)].slice(0, 3),
    count: events.filter(e => e.startMonth <= m && e.endMonth >= m).length,
  }));
  const maxMonth = Math.max(...byMonth.map(m => m.count), 1);

  // אירועים לפי תחום
  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    count: events.filter(e => e.categoryId === cat.id || e.categoryId === cat.name).length,
  })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
  const maxCat = Math.max(...byCategory.map(c => c.count), 1);

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "עכשיו";
    if (mins < 60) return `לפני ${mins} דק׳`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `לפני ${hrs} שע׳`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `לפני ${days} ימים`;
    return new Date(iso).toLocaleDateString("he-IL");
  }

  const ACTION_LABELS = { create: "יצר אירוע", update: "עדכן אירוע", delete: "מחק אירוע" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <TopBar
        variant="admin"
        title="דשבורד מנהלי"
        subtitle="ADMIN · CONTROL"
        rightContent={
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
            🛡 מנהל-על
          </span>
        }
      />

      <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>

        {/* כרטיסי סיכום */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { label: "סה״כ אירועים תשפ״ו", value: totalEvents,     color: "#1A1A1A", bg: "#fff" },
            { label: "מנהל החינוך",         value: educationCount,  color: "#185FA5", bg: "#E6F1FB" },
            { label: "מחלקת הנוער",          value: youthCount,      color: "#D85A30", bg: "#FAECE7" },
            { label: "חודש עמוס ביותר",     value: "מרץ",           color: "#7F77DD", bg: "#EEEDFE" },
          ].map(card => (
            <div key={card.label} style={{ background: card.bg, borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", border: "0.5px solid var(--border)" }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: card.color, marginBottom: 4 }}>{card.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* טאבים */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
          {([["overview", "סקירה"], ["log", "היסטוריית שינויים"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              background: "none", border: "none", padding: "10px 20px", fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
              color: activeTab === id ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: activeTab === id ? 600 : 400,
              borderBottom: activeTab === id ? "2px solid #1A1A1A" : "2px solid transparent",
              marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>

            {/* עמודות לפי חודש */}
            <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", border: "0.5px solid var(--border)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px", color: "var(--text-primary)" }}>
                אירועים פעילים לפי חודש
              </h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
                {byMonth.map(m => (
                  <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 500 }}>{m.count || ""}</div>
                    <div style={{
                      width: "100%", borderRadius: "3px 3px 0 0",
                      background: m.count > 5 ? "#185FA5" : m.count > 2 ? "#B5D4F4" : "#E6F1FB",
                      height: `${Math.max((m.count / maxMonth) * 90, m.count ? 8 : 2)}px`,
                      transition: "height 0.3s",
                    }} />
                    <div style={{ fontSize: 9, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* תחומים */}
            <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", border: "0.5px solid var(--border)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px", color: "var(--text-primary)" }}>
                פילוח לפי תחום
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {byCategory.slice(0, 7).map(cat => (
                  <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", minWidth: 110, textAlign: "right" }}>{cat.name}</span>
                    <div style={{ flex: 1, height: 8, background: "#F0F0EE", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 4,
                        background: cat.color,
                        width: `${(cat.count / maxCat) * 100}%`,
                        transition: "width 0.4s",
                      }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: cat.color, minWidth: 20 }}>{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* פילוח מחלקות — עוגה פשוטה */}
            <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", border: "0.5px solid var(--border)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px" }}>חלוקה בין מחלקות</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#E6F1FB" strokeWidth="20" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#185FA5" strokeWidth="20"
                    strokeDasharray={`${(educationCount / totalEvents) * 251} 251`}
                    strokeDashoffset="63" transform="rotate(-90 50 50)" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#D85A30" strokeWidth="20"
                    strokeDasharray={`${(youthCount / totalEvents) * 251} 251`}
                    strokeDashoffset={`${63 - (educationCount / totalEvents) * 251}`}
                    transform="rotate(-90 50 50)" />
                </svg>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "מנהל החינוך", count: educationCount, color: "#185FA5" },
                    { label: "מחלקת הנוער", count: youthCount,     color: "#D85A30" },
                  ].map(d => (
                    <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{d.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: d.color }}>{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* קישורים מהירים */}
            <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", border: "0.5px solid var(--border)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px" }}>ניווט מהיר</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { href: "/education",            label: "גאנט מנהל החינוך",      color: "#185FA5", bg: "#E6F1FB" },
                  { href: "/youth",                label: "גאנט מחלקת הנוער",      color: "#D85A30", bg: "#FAECE7" },
                  { href: "/luach",                label: "לוח ציבורי לתושבים",    color: "#1D9E75", bg: "#E1F5EE" },
                  { href: "/admin/users",          label: "👥 ניהול עובדים",          color: "#1A1A1A", bg: "#F5F5F3" },
                  { href: "/admin/infrastructures", label: "🏛 מאגר תשתיות",         color: "#1A1A1A", bg: "#F5F5F3" },
                ].map(link => (
                  <Link key={link.href} href={link.href} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: "var(--radius-md)",
                    background: link.bg, textDecoration: "none",
                    fontSize: 13, fontWeight: 500, color: link.color,
                    transition: "opacity 0.15s",
                  }}>
                    {link.label} ←
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "log" && (
          <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", border: "0.5px solid var(--border)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "var(--bg-secondary)", borderBottom: "0.5px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 80px 1fr 90px", gap: 12, fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
              <span>משתמש</span>
              <span>פעולה</span>
              <span>אירוע</span>
              <span>זמן</span>
            </div>
            {auditLog.length === 0 && (
              <p style={{ padding: 32, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
                אין עדיין שינויים מתועדים. ברגע שעובדים יוצרים/יעדכנו אירועים — הם יופיעו כאן.
              </p>
            )}
            {auditLog.map((row) => (
              <div key={row.id} style={{
                padding: "13px 16px", borderBottom: "0.5px solid var(--border)",
                display: "grid", gridTemplateColumns: "1fr 100px 1fr 110px", gap: 12,
                alignItems: "center", fontSize: 13,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: row.department === "education" ? "#E6F1FB" : "#FAECE7",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 600,
                    color: row.department === "education" ? "#185FA5" : "#D85A30",
                    flexShrink: 0,
                  }}>
                    {row.user_name?.[0] ?? "?"}
                  </div>
                  <span style={{ fontWeight: 500 }}>{row.user_name ?? "לא ידוע"}</span>
                </div>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 10, textAlign: "center",
                  background: row.action === "delete" ? "#FEE2E2" : row.action === "create" ? "#DCFCE7" : "#FEF9C3",
                  color:      row.action === "delete" ? "#991B1B" : row.action === "create" ? "#166534" : "#854D0E",
                }}>
                  {ACTION_LABELS[row.action]}
                </span>
                <span style={{ color: "var(--text-secondary)" }}>{row.event_name ?? "—"}</span>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{timeAgo(row.created_at)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ייצוא */}
        <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => { printEvents(dbEvents); toast("נפתח חלון הדפסה — אפשר לשמור כ-PDF", "info"); }} style={{
            padding: "10px 18px", fontSize: 13, fontWeight: 500,
            borderRadius: "var(--radius-md)",
            border: "0.5px solid var(--border)", background: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>📄 הדפסה / PDF</button>
          <button onClick={() => { exportToCSV(dbEvents); toast("הקובץ ירד למחשב!", "success"); }} style={{
            padding: "10px 18px", fontSize: 13, fontWeight: 500,
            borderRadius: "var(--radius-md)",
            border: "0.5px solid var(--border)", background: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>📊 ייצוא לאקסל (CSV)</button>
        </div>
      </div>
    </div>
  );
}
