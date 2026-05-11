"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ParentLoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        router.replace("/luach/my");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  async function handleGoogle() {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/luach/auth/callback` },
    });
    if (error) setError("Google OAuth עדיין לא מוגדר ב-Supabase. נסה שוב מאוחר יותר או הזן מייל.");
  }

  async function handleMagicLink() {
    if (!email.trim()) return;
    setError("");
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/luach/auth/callback` },
    });
    setSending(false);
    if (error) {
      setError("שגיאה בשליחת הקישור: " + error.message);
      return;
    }
    setSent(true);
  }

  if (checking) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
          🔐 בודק...
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div style={pageStyle}>
        <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 50, marginBottom: 16 }}>📧</div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 12px", color: "var(--text-primary)" }}>
            שלחנו לכם קישור!
          </h1>
          <div style={cardStyle}>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              בדקו את תיבת המייל שלכם.<br />
              לחיצה על הקישור תכניס אתכם אוטומטית.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 14 }}>📧 {email}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Link href="/luach" style={{ fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none" }}>
            → חזרה ללוח
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 500, margin: "8px 0 4px", color: "var(--text-primary)" }}>
            כניסה להורים 👨‍👩‍👧
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            כדי שהלוח האישי וההגדרות שלכם יישמרו
          </p>
        </div>

        <div style={cardStyle}>
          <button onClick={handleGoogle} style={oauthBtn}>
            <GoogleIcon /> כניסה עם Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
            <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>או קישור למייל</span>
            <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
          </div>

          <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
            כתובת מייל
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && email && handleMagicLink()}
            placeholder="your.name@gmail.com"
            style={inputStyle}
          />

          {error && <div style={errorStyle}>{error}</div>}

          <button onClick={handleMagicLink} disabled={!email || sending}
            style={{
              width: "100%", marginTop: 14, padding: "11px", fontSize: 14, fontWeight: 500,
              background: email ? "var(--parent-primary)" : "var(--bg-secondary)",
              color: email ? "#fff" : "var(--text-tertiary)",
              border: "none", borderRadius: "var(--radius-md)",
              cursor: email && !sending ? "pointer" : "not-allowed",
            }}>
            {sending ? "שולח..." : "שלח לי קישור כניסה ←"}
          </button>

          <p style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
            הלוח עצמו פתוח לכולם ללא רישום.<br />
            הרישום נדרש רק להתאמה אישית.
          </p>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh", background: "#fafaf7",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const cardStyle: React.CSSProperties = {
  background: "#fff", borderRadius: "var(--radius-xl)",
  padding: "1.75rem 1.5rem", border: "0.5px solid var(--border)",
  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", fontSize: 14,
  border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
  fontFamily: "inherit", outline: "none",
};
const errorStyle: React.CSSProperties = {
  marginTop: 12, padding: "8px 12px",
  background: "#FEF2F2", border: "1px solid #FCA5A5",
  borderRadius: "var(--radius-md)", fontSize: 12, color: "#991B1B",
};
const oauthBtn: React.CSSProperties = {
  width: "100%", padding: "11px", fontSize: 14,
  background: "#fff", color: "var(--text-primary)",
  border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  gap: 10, fontFamily: "inherit",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.547 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
