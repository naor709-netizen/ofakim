"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getUserByEmail, saveSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const intendedDept = params.get("dept");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    const user = await getUserByEmail(email.trim());
    setLoading(false);
    if (!user) {
      setError("המייל הזה לא רשום במערכת. פנה למנהל-העל.");
      return;
    }
    saveSession(user);
    if (user.role === "admin") {
      router.push("/admin");
    } else if (user.department === "education") {
      router.push("/education");
    } else if (user.department === "youth") {
      router.push("/youth");
    } else {
      setError("המשתמש שלך לא משויך למחלקה. פנה למנהל-העל.");
    }
  }

  async function handleGoogleLogin() {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError("Google OAuth עדיין לא מוגדר ב-Supabase. השתמש בכניסה עם מייל בינתיים.");
    }
  }

  async function handleMicrosoftLogin() {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "email",
      },
    });
    if (error) {
      setError("Microsoft OAuth עדיין לא מוגדר ב-Supabase.");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#fafaf7",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Link href="/" style={{ fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none" }}>
            → חזרה לדף הבית
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 500, margin: "8px 0 4px", color: "var(--text-primary)" }}>
            כניסת עובדים 🔐
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            פורטל הגאנט – עיריית אופקים
          </p>
        </div>

        <div style={{
          background: "#fff", borderRadius: "var(--radius-xl)",
          padding: "1.75rem 1.5rem", border: "0.5px solid var(--border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}>
          {/* Google OAuth - יוצג כשיוגדר ב-Supabase */}
          <button
            onClick={handleGoogleLogin}
            style={{
              width: "100%", padding: "11px", fontSize: 14,
              background: "#fff", color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              marginBottom: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.547 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            כניסה עם Google
          </button>
          <button
            onClick={handleMicrosoftLogin}
            style={{
              width: "100%", padding: "11px", fontSize: 14,
              background: "#fff", color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              marginBottom: 16,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 21 21">
              <rect x="1" y="1"  width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            כניסה עם Microsoft
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
            <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>או</span>
            <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              כתובת מייל של העירייה
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && email && handleLogin()}
              placeholder="your.name@ofakim.muni.il"
              style={{
                width: "100%", padding: "10px 12px", fontSize: 14,
                border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                fontFamily: "inherit", outline: "none",
              }}
            />
          </div>

          {error && (
            <div style={{
              marginTop: 12, padding: "8px 12px",
              background: "#FEF2F2", border: "1px solid #FCA5A5",
              borderRadius: "var(--radius-md)", fontSize: 12, color: "#991B1B",
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!email || loading}
            style={{
              width: "100%", marginTop: 14, padding: "11px",
              fontSize: 14, fontWeight: 500,
              background: email ? "#1A1A1A" : "var(--bg-secondary)",
              color: email ? "#fff" : "var(--text-tertiary)",
              border: "none", borderRadius: "var(--radius-md)",
              cursor: email ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "בודק..." : "כניסה ←"}
          </button>
        </div>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="/luach" style={{ fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none" }}>
            תושב? לחץ כאן ללוח האירועים הציבורי
          </Link>
        </div>

        <p style={{ marginTop: 24, fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", lineHeight: 1.6 }}>
          לבדיקה: השתמש באחד מהמיילים הדמו —<br/>
          <code style={{ background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: 4 }}>education1@ofakim.muni.il</code> /
          <code style={{ background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: 4, marginRight: 4 }}>youth1@ofakim.muni.il</code>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
