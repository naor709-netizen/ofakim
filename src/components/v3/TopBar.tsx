"use client";

import Link from "next/link";
import Image from "next/image";
import { Tag } from "./Tag";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  variant?: "neutral" | "edu" | "youth" | "parent" | "admin";
  rightContent?: React.ReactNode;
  showOfaktiviLogo?: boolean;
  backHref?: string;
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
}: TopBarProps) {
  const c = VARIANT_COLORS[variant];

  return (
    <header style={{
      background: c.bg, color: c.text,
      borderBottom: variant === "neutral" ? "0.5px solid var(--line)" : "none",
      display: "flex", alignItems: "center",
      padding: "12px 24px", gap: 14, flexWrap: "wrap",
      position: "relative", zIndex: 10,
    }}>
      {/* Logos */}
      <Link href="/" style={{
        display: "flex", alignItems: "center", gap: 12,
        textDecoration: "none", color: "inherit",
      }}>
        <div style={{
          width: 40, height: 40,
          background: variant === "neutral" ? "transparent" : "rgba(255,255,255,0.95)",
          borderRadius: 8, padding: variant === "neutral" ? 0 : 4,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Image src="/logo-ofakim.png" alt="עיריית אופקים"
            width={32} height={32} style={{ objectFit: "contain" }} />
        </div>
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

      {/* Ofaktivi logo */}
      {showOfaktiviLogo && (
        <>
          <div style={{
            width: 1, height: 28,
            background: variant === "neutral" ? "var(--line)" : "rgba(255,255,255,0.25)",
          }} />
          <div style={{
            background: variant === "neutral" ? "transparent" : "rgba(255,255,255,0.95)",
            borderRadius: 8, padding: variant === "neutral" ? 0 : 4,
            display: "flex", alignItems: "center",
          }}>
            <Image src="/logo-ofaktivi.png" alt="אופקטיבי"
              width={88} height={32}
              style={{ objectFit: "contain", height: 28, width: "auto" }} />
          </div>
        </>
      )}

      {/* Right content */}
      <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {rightContent}
        {backHref && (
          <Link href={backHref} style={{
            color: variant === "neutral" ? "var(--ink2)" : "rgba(255,255,255,0.85)",
            textDecoration: "none", fontSize: 12,
          }}>
            → דף הבית
          </Link>
        )}
      </div>
    </header>
  );
}
