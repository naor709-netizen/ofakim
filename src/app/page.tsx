"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Tag, Eyebrow, SoftBlob } from "@/components/v3/Tag";

interface CardConfig {
  id: "edu" | "youth" | "parent";
  href: string;
  label: string;
  sub: string;
  pop: string; popLight: string; popMid: string; dark: string;
  stat: string; statLbl: string;
  icon: React.ReactNode;
}

const CARDS: CardConfig[] = [
  {
    id: "edu", href: "/login?dept=education",
    label: "מנהל החינוך", sub: "גיל הרך · יסודי · על-יסודי · חרדי · קייטנות · הכשרות",
    pop: "var(--edu)", popLight: "var(--edu-ll)", popMid: "var(--edu-l)", dark: "var(--edu-d)",
    stat: "—", statLbl: "אירועים השנה",
    icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>),
  },
  {
    id: "youth", href: "/login?dept=youth",
    label: "מחלקת הנוער", sub: "תנועת חלום · תנועות נוער · מעורבות · מ\"ש · מכינות",
    pop: "var(--youth)", popLight: "var(--youth-ll)", popMid: "var(--youth-l)", dark: "var(--youth-d)",
    stat: "—", statLbl: "תוכניות פעילות",
    icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><path d="M14 20c0-2.5 2-4 4-4s3 1 3 3"/></svg>),
  },
  {
    id: "parent", href: "/luach",
    label: "לוח לתושבים", sub: "לוח קהילתי פתוח · ללא הרשמה · בעברית פשוטה",
    pop: "var(--parent)", popLight: "var(--parent-ll)", popMid: "var(--parent-l)", dark: "var(--parent-d)",
    stat: "פתוח", statLbl: "לכלל הציבור",
    icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>),
  },
];

export default function LandingPage() {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", direction: "rtl", color: "var(--ink)" }}>

      {/* Topbar */}
      <header className="landing-topbar" style={{
        display: "flex", alignItems: "center",
        borderBottom: "0.5px solid var(--line)", background: "var(--surface)",
        gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Image src="/logo-ofakim.png" alt="עיריית אופקים" width={40} height={40} style={{ objectFit: "contain" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-display)" }}>פורטל אופקים</span>
            <span className="eyebrow" style={{ fontSize: 9 }}>עיריית אופקים · חינוך ונוער</span>
          </div>
        </div>
        <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <Tag dot live style={{ color: "var(--parent)" }}>חי עכשיו</Tag>
          <Tag>תשפ״ו</Tag>
          <Link href="/login" className="btn-v3" style={{ padding: "6px 14px", textDecoration: "none" }}>
            כניסת עובדים
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero" style={{ position: "relative", overflow: "hidden" }}>
        <SoftBlob color="var(--accent)" size={260} top={-80} left={120} opacity={0.45} />
        <SoftBlob color="var(--parent-l)" size={200} top={80} left={-60} opacity={0.6} />

        <div style={{ position: "relative", maxWidth: 800 }}>
          <Eyebrow style={{ marginBottom: 14, color: "var(--ink3)" }}>—— פורטל הגאנט השנתי</Eyebrow>
          <h1 className="disp" style={{ margin: 0, fontSize: "clamp(44px, 8vw, 78px)", lineHeight: 0.96 }}>
            <span style={{ display: "block" }}>שנה אחת.</span>
            <span style={{ display: "inline-block" }}>
              שלוש שפות.{" "}
              <span style={{ position: "relative" }}>
                <span style={{ position: "relative", zIndex: 1 }}>לוח אחד.</span>
                <svg style={{ position: "absolute", bottom: -4, right: -6, width: "108%", height: 14, zIndex: 0 }} viewBox="0 0 200 14" preserveAspectRatio="none">
                  <path d="M2 8 C 50 2, 100 12, 198 6" stroke="var(--accent)" strokeWidth="6" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </span>
          </h1>
          <p style={{ fontSize: 16, color: "var(--ink2)", marginTop: 22, maxWidth: 580, lineHeight: 1.55 }}>
            הגאנט של מנהל החינוך ומחלקת הנוער, ולוח קהילתי לתושבים — מסתנכרנים בזמן אמת,
            נגישים מכל מקום, בנויים בעברית מהקרקע.
          </p>

          <div style={{ display: "flex", gap: 8, marginTop: 26, flexWrap: "wrap" }}>
            <Tag variant="edu">SSO · Google / Microsoft</Tag>
            <Tag variant="parent">תושבים · ללא הרשמה</Tag>
            <Tag variant="bot">בוט אופק · עוזר חכם</Tag>
            <Tag>RTL · עברית מקצה לקצה</Tag>
          </div>
        </div>
      </section>

      {/* Entry blocks */}
      <section className="landing-entries">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <Eyebrow>→ בחרו כניסה</Eyebrow>
          <Tag>3 כניסות</Tag>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
        }}>
          {CARDS.map(c => (
            <Link key={c.id} href={c.href} style={{ textDecoration: "none", color: "inherit" }}>
              <div
                onMouseEnter={() => setHover(c.id)}
                onMouseLeave={() => setHover(null)}
                style={{
                  position: "relative", padding: "26px 26px 22px",
                  borderRadius: "var(--r-xl)",
                  border: `0.5px solid ${hover === c.id ? c.pop : "var(--line)"}`,
                  background: c.popLight, cursor: "pointer", overflow: "hidden",
                  transition: "transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s, border-color .15s",
                  transform: hover === c.id ? "translateY(-4px)" : "none",
                  boxShadow: hover === c.id ? "0 14px 36px rgba(26,26,26,0.10)" : "none",
                  minHeight: 252,
                }}
              >
                <div style={{
                  position: "absolute", top: -30, left: -30,
                  width: 120, height: 120, borderRadius: "50%",
                  background: c.popMid, filter: "blur(30px)", opacity: 0.5,
                }} />
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: c.pop, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16, position: "relative", zIndex: 1,
                }}>{c.icon}</div>

                <div className="disp" style={{ fontSize: 30, color: c.dark, marginBottom: 6, position: "relative" }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 12.5, color: c.dark, opacity: 0.85, lineHeight: 1.55, position: "relative" }}>
                  {c.sub}
                </div>

                <div style={{
                  display: "flex", alignItems: "flex-end", justifyContent: "space-between",
                  marginTop: 18, paddingTop: 14, borderTop: `0.5px solid ${c.popMid}`,
                  position: "relative",
                }}>
                  <div>
                    <div className="num" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: c.dark }}>
                      {c.stat}
                    </div>
                    <div className="eyebrow" style={{ marginTop: 4, fontSize: 9, color: c.dark, opacity: 0.65 }}>
                      {c.statLbl}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, color: c.dark }}>
                    כניסה
                    <span style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: c.pop, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14,
                      transition: "transform .2s",
                      transform: hover === c.id ? "translateX(-3px)" : "none",
                    }}>←</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Admin link */}
        <div style={{ marginTop: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ flex: 1, height: "0.5px", background: "var(--line)" }} />
            <Eyebrow>אזור ניהול</Eyebrow>
            <div style={{ flex: 1, height: "0.5px", background: "var(--line)" }} />
          </div>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <div className="btn-v3" style={{
              width: "100%", justifyContent: "center", padding: "12px",
              fontSize: 13, color: "var(--ink2)",
            }}>
              🛡 כניסה לדשבורד מנהלי
            </div>
          </Link>
        </div>
      </section>

      {/* Bottom strip */}
      <footer className="landing-footer" style={{
        background: "var(--ink)", color: "var(--ink4)",
        display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
        fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.06em",
      }}>
        <span style={{ color: "var(--accent)" }}>● Connected · Supabase realtime</span>
        <span style={{ opacity: 0.4 }}>|</span>
        <span>/education</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>/youth</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>/luach</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>/admin</span>
        <span style={{ marginRight: "auto", opacity: 0.6 }}>ofakim.muni.il/portal</span>
      </footer>
    </div>
  );
}
