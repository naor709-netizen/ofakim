"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "./Tag";
import { loadSession, clearSession, type AppUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  variant?: "neutral" | "edu" | "youth" | "parent" | "admin";
  rightContent?: React.ReactNode;
  showOfaktiviLogo?: boolean;
  backHref?: string;
  showUserChip?: boolean;
}

const VARIANT_COLORS = {
  neutral: { bg: "var(--surface)", text: "var(--ink)" },
  edu:     { bg: "var(--edu)",     text: "#fff" },
  youth:   { bg: "var(--youth)",   text: "#fff" },
  parent:  { bg: "var(--parent)",  text: "#fff" },
  admin:   { bg: "var(--ink)",     text: "#fff" },
};

export function TopBar({
  title, subtitle, variant = "neutral",
  rightContent, showOfaktiviLogo = true, backHref,
  showUserChip = true,
}: TopBarProps) {
  const c = VARIANT_COLORS[variant];
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(loadSession());
    function onStorage(e: StorageEvent) {
      if (e.key === "ofakim-session") setUser(loadSession());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  async function handleLogout() {
    clearSession();
    try { await supabase.auth.signOut(); } catch {}
    setUser(null);
    setMenuOpen(false);
    router.push("/");
  }

  const chipBg = variant === "neutral" ? "var(--bg-secondary, #f4f4ed)" : "rgba(255,255,255,0.18)";
  const chipText = variant === "neutral" ? "var(--ink)" : "#fff";

  return (
    <header style={{
      background: c.bg, color: c.text,
      borderBottom: variant === "neutral" ? "0.5px solid var(--line)" : "none",
      display: "flex", alignItems: "center",
      padding: "10px 16px", gap: 10, flexWrap: "nowrap",
      overflowX: "auto", position: "relative", zIndex: 10,
      scrollbarWidth: "none",
    }}>
      {/* Logos */}
      <Link href="/" style={{
        display: "flex", alignItems: "center", gap: 10,
        textDecoration: "none", color: "inherit", flexShrink: 0,
      }}>
        <Image src="/logo-ofakim.png" alt="עיריית אופקים"
          width={36} height={36}
          style={{
            objectFit: "contain",
            filter: variant !== "neutral" ? "brightness(0) invert(1)" : "none",
          }} />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)" }}>
            {title || "פורטל אופקים"}
          </span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9,
            letterSpacing: "0.1em", textTransform: "uppercase",
            opacity: variant === "neutral" ? 0.6 : 0.85,
          }}>
            {subtitle || "עיריית אופקים · חינוך ונוער"}
          </span>
        </div>
      </Link>

      {/* Education logo — shown only on edu variant */}
      {variant === "edu" && (
        <>
          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
          <div style={{
            background: "rgba(255,255,255,0.92)", borderRadius: 8,
            padding: "3px 8px", display: "flex", alignItems: "center", flexShrink: 0,
          }}>
            <Image src="/logo-education.png" alt="מערכת החינוך אופקים"
              width={72} height={28}
              style={{ objectFit: "contain", height: 26, width: "auto" }} />
          </div>
        </>
      )}

      {/* Ofaktivi logo */}
      {showOfaktiviLogo && (
        <>
          <div style={{
            width: 1, height: 28, flexShrink: 0,
            background: variant === "neutral" ? "var(--line)" : "rgba(255,255,255,0.3)",
          }} />
          <Image src="/logo-ofaktivi.png" alt="אופקטיבי"
            width={92} height={32}
            style={{
              objectFit: "contain", height: 28, width: "auto", flexShrink: 0,
              filter: variant !== "neutral" ? "brightness(0) invert(1)" : "none",
            }} />
        </>
      )}

      {/* Right content */}
      <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {rightContent}
        {backHref && (
          <Link href={backHref} style={{
            color: variant === "neutral" ? "var(--ink2)" : "rgba(255,255,255,0.85)",
            textDecoration: "none", fontSize: 12,
          }}>
            → דף הבית
          </Link>
        )}
        {showUserChip && user && (
          <div style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(o => !o)} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: chipBg, color: chipText,
              border: "none", padding: "6px 12px", borderRadius: 999,
              fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: "50%",
                background: variant === "neutral" ? "var(--ink)" : "rgba(255,255,255,0.3)",
                color: variant === "neutral" ? "#fff" : "#fff",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 600,
              }}>{user.full_name.trim().charAt(0)}</span>
              <span>{user.full_name}</span>
              <span style={{ opacity: 0.6, fontSize: 10 }}>▾</span>
            </button>
            {menuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", insetInlineEnd: 0,
                background: "#fff", color: "var(--ink, #1a1a1a)",
                border: "0.5px solid var(--line, rgba(0,0,0,0.1))",
                borderRadius: 12, minWidth: 200,
                boxShadow: "0 6px 24px rgba(0,0,0,0.12)", padding: 6, zIndex: 50,
              }}>
                <div style={{ padding: "8px 12px", fontSize: 11, color: "#666", borderBottom: "0.5px solid #eee" }}>
                  {user.email}
                  <div style={{ fontSize: 10, marginTop: 2, color: "#999" }}>
                    {user.role === "admin" ? "מנהל-על" : user.department === "education" ? "מנהל החינוך" : "מחלקת הנוער"}
                  </div>
                </div>
                {user.role === "admin" && (
                  <Link href="/admin" onClick={() => setMenuOpen(false)} style={menuItem}>
                    דשבורד ניהול
                  </Link>
                )}
                {user.department === "education" && (
                  <Link href="/education" onClick={() => setMenuOpen(false)} style={menuItem}>
                    גאנט מנהל החינוך
                  </Link>
                )}
                {user.department === "youth" && (
                  <Link href="/youth" onClick={() => setMenuOpen(false)} style={menuItem}>
                    גאנט מחלקת הנוער
                  </Link>
                )}
                <Link href="/luach" onClick={() => setMenuOpen(false)} style={menuItem}>
                  לוח התושבים
                </Link>
                <button onClick={handleLogout} style={{ ...menuItem, width: "100%", textAlign: "right", border: "none", background: "transparent", cursor: "pointer", color: "#b91c1c" }}>
                  יציאה
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

const menuItem: React.CSSProperties = {
  display: "block", padding: "8px 12px", fontSize: 13,
  textDecoration: "none", color: "inherit", borderRadius: 8,
  fontFamily: "inherit",
};
