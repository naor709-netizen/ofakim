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
import { NotificationBell } from "@/components/v3/NotificationBell";

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
          <>
            <NotificationBell adminOnly />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
              🛡 מנהל-על
            </span>
          </>
        }
      />

      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>

        {/* Hero צבעוני - צבעי אופקים */}
        <div style={{
          background: "linear-gradient(135deg, #185FA5 0%, #7F77DD 35%, #D85A30 75%, #E8B454 100%)",
          borderRadius: 22, padding: "1.75rem 2rem",
          marginBottom: 24, position: "relative", overflow: "hidden",
          color: "#fff",
        }}>
          <div style={{ position: "absolute", top: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.15)", filter: "blur(40px)" }} />
          <div style={{ position: "absolute", bottom: -80, right: -40, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.1)", filter: "blur(50px)" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, opacity: 0.85, textTransform: "uppercase" }}>
                🛡 ADMIN · OFAKIM
              </div>
              <h1 style={{ fontSize: 34, fontWeight: 700, margin: "6px 0 6px", letterSpacing: -0.5 }}>
                שלום{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""} 👋
              </h1>
              <p style={{ fontSize: 14, opacity: 0.92, margin: 0 }}>
                {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · עיריית אופקים
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                { num: totalEvents, label: "אירועים" },
                { num: educationCount + youthCount > 0 ? Math.round((educationCount / Math.max(1, totalEvents)) * 100) : 0, label: "% חינוך", suffix: "%" },
                { num: Math.max(...byMonth.map(m => m.count), 0), label: "שיא חודשי" },
              ].map(s => (
                <div key={s.label} style={{
                  background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
                  borderRadius: 14, padding: "10px 18px", textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.25)", minWidth: 80,
                }}>
                  <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{s.num}{s.suffix || ""}</div>
                  <div style={{ fontSize: 10, marginTop: 4, opacity: 0.9, letterSpacing: 0.3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* כרטיסי סיכום צבעוניים עם אייקונים */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { label: "סה״כ אירועים תשפ״ו", value: totalEvents,     emoji: "📅", grad: "linear-gradient(135deg, #fefefe 0%, #f7f7f3 100%)", accent: "#1A1A1A" },
            { label: "מנהל החינוך",         value: educationCount,  emoji: "🎓", grad: "linear-gradient(135deg, #E6F1FB 0%, #B5D4F4 100%)", accent: "#0C447C" },
            { label: "מחלקת הנוער",          value: youthCount,      emoji: "🔥", grad: "linear-gradient(135deg, #FAECE7 0%, #F5C4B3 100%)", accent: "#993C1D" },
            { label: "חודש עמוס ביותר",     value: byMonth.reduce((a,b) => b.count > a.count ? b : a, byMonth[0])?.label || "—", emoji: "⚡", grad: "linear-gradient(135deg, #FFF8EE 0%, #F5C57E 100%)", accent: "#7C4A0A" },
          ].map(card => (
            <div key={card.label} style={{
              background: card.grad, borderRadius: 18,
              padding: "1.25rem 1.5rem", border: "1px solid rgba(0,0,0,0.04)",
              position: "relative", overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{ position: "absolute", top: 12, left: 12, fontSize: 24, opacity: 0.65 }}>{card.emoji}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: card.accent, marginBottom: 4, lineHeight: 1.1 }}>{card.value}</div>
              <div style={{ fontSize: 12, color: card.accent, opacity: 0.75, fontWeight: 500 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* טאבים — pill style */}
        <div style={{ display: "inline-flex", gap: 4, marginBottom: 20, padding: 4, background: "#F4F4F1", borderRadius: 12 }}>
          {([
            { id: "overview", label: "סקירה",            emoji: "📊" },
            { id: "log",      label: "היסטוריית שינויים", emoji: "📋" },
          ] as const).map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                background: active ? "#fff" : "transparent",
                border: "none", padding: "8px 16px", fontSize: 13,
                cursor: "pointer", fontFamily: "inherit",
                color: active ? "#1A1A1A" : "var(--text-secondary)",
                fontWeight: active ? 600 : 500,
                borderRadius: 9,
                boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.15s",
              }}>
                <span>{t.emoji}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>

            {/* עמודות לפי חודש — צבעוני */}
            <div style={{ background: "#fff", borderRadius: 18, padding: "1.25rem 1.5rem", border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 6 }}>
                <span>📊</span> אירועים פעילים לפי חודש
              </h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 130 }}>
                {byMonth.map(m => {
                  const intensity = m.count / maxMonth;
                  const grad = intensity > 0.66 ? "linear-gradient(180deg, #D85A30 0%, #E8B454 100%)"
                             : intensity > 0.33 ? "linear-gradient(180deg, #185FA5 0%, #7F77DD 100%)"
                             : "linear-gradient(180deg, #B5D4F4 0%, #E6F1FB 100%)";
                  return (
                    <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>{m.count || ""}</div>
                      <div style={{
                        width: "100%", borderRadius: "6px 6px 2px 2px",
                        background: grad,
                        height: `${Math.max((m.count / maxMonth) * 95, m.count ? 8 : 2)}px`,
                        transition: "height 0.3s",
                        boxShadow: m.count > 0 ? "0 -2px 4px rgba(0,0,0,0.05)" : "none",
                      }} />
                      <div style={{ fontSize: 9, color: "var(--text-tertiary)", whiteSpace: "nowrap", fontWeight: 500 }}>{m.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* תחומים — bars צבעוניים */}
            <div style={{ background: "#fff", borderRadius: 18, padding: "1.25rem 1.5rem", border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 6 }}>
                <span>🎨</span> פילוח לפי תחום
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {byCategory.slice(0, 7).map(cat => (
                  <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", minWidth: 110, textAlign: "right", fontWeight: 500 }}>{cat.name}</span>
                    <div style={{ flex: 1, height: 10, background: "#F4F4F1", borderRadius: 6, overflow: "hidden", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)" }}>
                      <div style={{
                        height: "100%", borderRadius: 6,
                        background: `linear-gradient(90deg, ${cat.color}DD 0%, ${cat.color} 100%)`,
                        width: `${(cat.count / maxCat) * 100}%`,
                        transition: "width 0.4s",
                        boxShadow: `0 0 8px ${cat.color}33`,
                      }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, minWidth: 20 }}>{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* פילוח מחלקות — עוגה צבעונית */}
            <div style={{ background: "#fff", borderRadius: 18, padding: "1.25rem 1.5rem", border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 6 }}>
                <span>🥧</span> חלוקה בין מחלקות
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <svg width="110" height="110" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="eduGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#185FA5" />
                      <stop offset="100%" stopColor="#7F77DD" />
                    </linearGradient>
                    <linearGradient id="youthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#D85A30" />
                      <stop offset="100%" stopColor="#E8B454" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#F4F4F1" strokeWidth="18" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="url(#eduGrad)" strokeWidth="18"
                    strokeDasharray={`${(educationCount / Math.max(1, totalEvents)) * 251} 251`}
                    strokeDashoffset="63" transform="rotate(-90 50 50)" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="url(#youthGrad)" strokeWidth="18"
                    strokeDasharray={`${(youthCount / Math.max(1, totalEvents)) * 251} 251`}
                    strokeDashoffset={`${63 - (educationCount / Math.max(1, totalEvents)) * 251}`}
                    transform="rotate(-90 50 50)" strokeLinecap="round" />
                </svg>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: "מנהל החינוך", count: educationCount, color: "#185FA5", emoji: "🎓" },
                    { label: "מחלקת הנוער", count: youthCount,     color: "#D85A30", emoji: "🔥" },
                  ].map(d => (
                    <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{d.emoji}</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{d.label}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: d.color }}>{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ניווט מהיר — כרטיסיות צבעוניות */}
            <div style={{ background: "#fff", borderRadius: 18, padding: "1.25rem 1.5rem", border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>🧭</span> ניווט מהיר
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {[
                  { href: "/education",             emoji: "🎓", label: "גאנט חינוך",     accent: "#185FA5", bg: "linear-gradient(135deg, #E6F1FB 0%, #B5D4F4 100%)" },
                  { href: "/youth",                 emoji: "🔥", label: "גאנט נוער",      accent: "#993C1D", bg: "linear-gradient(135deg, #FAECE7 0%, #F5C4B3 100%)" },
                  { href: "/luach",                 emoji: "🌳", label: "לוח לתושבים",    accent: "#0F6E56", bg: "linear-gradient(135deg, #E1F5EE 0%, #9FE1CB 100%)" },
                  { href: "/admin/users",           emoji: "👥", label: "ניהול עובדים",   accent: "#7C4A0A", bg: "linear-gradient(135deg, #FFF8EE 0%, #F5C57E 100%)" },
                  { href: "/admin/infrastructures", emoji: "🏛", label: "מאגר תשתיות",    accent: "#4338CA", bg: "linear-gradient(135deg, #EEEDFE 0%, #C7C4F5 100%)" },
                  { href: "/admin/categories",      emoji: "🏷", label: "תחומים",          accent: "#BE185D", bg: "linear-gradient(135deg, #FCE7F3 0%, #F9A8D4 100%)" },
                ].map(link => (
                  <Link key={link.href} href={link.href} style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
                    padding: "12px 14px", borderRadius: 14,
                    background: link.bg, textDecoration: "none",
                    color: link.accent, transition: "transform 0.15s, box-shadow 0.15s",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}
                  >
                    <span style={{ fontSize: 22 }}>{link.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{link.label} ←</span>
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
        <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => { printEvents(dbEvents); toast("נפתח חלון הדפסה — אפשר לשמור כ-PDF", "info"); }} style={{
            padding: "10px 18px", fontSize: 13, fontWeight: 600,
            borderRadius: 12, color: "#0C447C",
            border: "1px solid #B5D4F4", background: "linear-gradient(135deg, #fff 0%, #E6F1FB 100%)",
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6,
          }}>📄 הדפסה / PDF</button>
          <button onClick={() => { exportToCSV(dbEvents); toast("הקובץ ירד למחשב!", "success"); }} style={{
            padding: "10px 18px", fontSize: 13, fontWeight: 600,
            borderRadius: 12, color: "#0F6E56",
            border: "1px solid #9FE1CB", background: "linear-gradient(135deg, #fff 0%, #E1F5EE 100%)",
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6,
          }}>📊 ייצוא לאקסל (CSV)</button>
        </div>
      </div>
    </div>
  );
}
