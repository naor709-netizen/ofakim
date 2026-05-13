"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function ResidentLoginContent() {
  const params = useSearchParams();
  const next = params.get("next") || "/luach/my";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent]   = useState(false);

  async function sendLink() {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) {
      setError("שגיאה בשליחה: " + error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div style={pageStyle}>
        <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 12px", color: "#04342C" }}>
            שלחנו קישור למייל!
          </h1>
          <div style={cardStyle}>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              פתח את המייל שלך ולחץ על הקישור כדי להיכנס.
              <br />
              הקישור תקף ל-60 דקות.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 14 }}>
              📧 {email}
            </p>
          </div>
          <button onClick={() => { setSent(false); setEmail(""); }}
            style={{ marginTop: 18, padding: "10px 20px", fontSize: 13, background: "#fff",
              border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
            כתובת אחרת
          </button>
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
          <h1 style={{ fontSize: 24, fontWeight: 500, margin: "8px 0 4px", color: "#04342C" }}>
            כניסת תושבים 👨‍👩‍👧
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            נשלח לך קישור התחברות במייל — בלי סיסמאות
          </p>
        </div>

        <div style={cardStyle}>
          <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
            כתובת מייל
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && email && sendLink()}
            placeholder="your.name@example.com"
            style={inputStyle}
          />

          {error && <div style={errorStyle}>{error}</div>}

          <button onClick={sendLink} disabled={!email || loading}
            style={{
              width: "100%", marginTop: 14, padding: "11px", fontSize: 14, fontWeight: 500,
              background: email ? "var(--parent-primary)" : "var(--bg-secondary)",
              color: email ? "#fff" : "var(--text-tertiary)",
              border: "none", borderRadius: "var(--radius-md)",
              cursor: email ? "pointer" : "not-allowed",
            }}>
            {loading ? "שולח..." : "שלח לי קישור התחברות ←"}
          </button>

          <p style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
            תקבל מייל עם קישור — לחיצה עליו תכניס אותך באופן אוטומטי.
          </p>
        </div>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="/login" style={{ fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none" }}>
            עובד עירייה? לחץ כאן לכניסת עובדים ←
          </Link>
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

export default function ResidentLoginPage() {
  return <Suspense fallback={null}><ResidentLoginContent /></Suspense>;
}
