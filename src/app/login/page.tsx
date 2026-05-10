"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getUserByEmail, saveSession, loadSession, createUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const intendedDept = params.get("dept");
  const [step, setStep] = useState<"email" | "register" | "pending">("email");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const session = loadSession();
    if (!session || !session.active) {
      setCheckingSession(false);
      return;
    }
    if (session.role === "admin")              router.replace("/admin");
    else if (session.department === "education") router.replace("/education");
    else if (session.department === "youth")     router.replace("/youth");
    else                                          setCheckingSession(false);
  }, [router]);
  const [email, setEmail]     = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState<"education" | "youth">(
    (intendedDept === "youth" ? "youth" : "education")
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    const user = await getUserByEmail(email.trim());
    setLoading(false);

    if (!user) {
      // משתמש חדש — מציג טופס רישום
      setStep("register");
      return;
    }
    if (!user.active) {
      // ממתין לאישור
      setStep("pending");
      return;
    }
    saveSession(user);
    if (user.role === "admin")              router.push("/admin");
    else if (user.department === "education") router.push("/education");
    else if (user.department === "youth")     router.push("/youth");
    else                                       setStep("pending");
  }

  async function handleRegister() {
    if (!fullName.trim()) { setError("יש להזין שם מלא"); return; }
    setError(""); setLoading(true);
    // הוספה ישירה ללא select() — בשביל לעקוף RLS על read
    const { error: insertError } = await supabase
      .from("users")
      .insert({
        email:      email.trim().toLowerCase(),
        full_name:  fullName.trim(),
        role:       "staff",
        department,
        active:     false,
      });
    setLoading(false);
    if (insertError) {
      if (insertError.code === "23505") {
        setError("המייל הזה כבר רשום במערכת. אם הבקשה שלך עדיין ממתינה לאישור — חכה למנהל-העל.");
      } else if (insertError.code === "42501" || insertError.message.includes("policy") || insertError.message.includes("RLS")) {
        setError("המערכת עדיין לא מאפשרת הרשמה עצמית. פנה למנהל-העל שיוסיף לכם ידנית, או שיריץ את schema-all-new.sql ב-Supabase.");
      } else {
        setError("שגיאה: " + insertError.message);
      }
      return;
    }
    setStep("pending");
  }

  async function handleGoogleLogin() {
    setError("");
    const dept = intendedDept === "youth" ? "youth" : "education";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?dept=${dept}` },
    });
    if (error) setError("Google OAuth עדיין לא מוגדר ב-Supabase. השתמש בכניסה עם מייל בינתיים.");
  }

  async function handleMicrosoftLogin() {
    setError("");
    const dept = intendedDept === "youth" ? "youth" : "education";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { redirectTo: `${window.location.origin}/auth/callback?dept=${dept}`, scopes: "email" },
    });
    if (error) setError("Microsoft OAuth עדיין לא מוגדר ב-Supabase.");
  }

  if (checkingSession) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
          🔐 מאמת...
        </div>
      </div>
    );
  }

  // ----- מסך "ממתין לאישור" -----
  if (step === "pending") {
    return (
      <div style={pageStyle}>
        <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 50, marginBottom: 16 }}>⏳</div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 12px", color: "var(--text-primary)" }}>
            הבקשה שלך התקבלה!
          </h1>
          <div style={cardStyle}>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              הבקשה שלך נשלחה למנהל-העל לאישור.<br/>
              ברגע שתאושר תוכל להיכנס למערכת.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 14 }}>
              📧 {email}
            </p>
          </div>
          <button onClick={() => { setStep("email"); setEmail(""); setFullName(""); }}
            style={{ marginTop: 18, padding: "10px 20px", fontSize: 13, background: "#fff",
              border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
            חזרה למסך התחברות
          </button>
        </div>
      </div>
    );
  }

  // ----- מסך הרשמה (משתמש חדש) -----
  if (step === "register") {
    return (
      <div style={pageStyle}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 500, margin: "8px 0 4px", color: "var(--text-primary)" }}>
              ✨ עובד חדש?
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              מלא פרטים ותקבל אישור ממנהל-העל
            </p>
          </div>
          <div style={cardStyle}>
            <Field label="כתובת מייל">
              <input value={email} disabled style={{ ...inputStyle, background: "var(--bg-secondary)", color: "var(--text-secondary)" }} />
            </Field>
            <Field label="שם מלא *">
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="ישראל ישראלי"
                onKeyDown={e => e.key === "Enter" && fullName && handleRegister()} style={inputStyle} />
            </Field>
            <Field label="המחלקה שלך *">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={() => setDepartment("education")} type="button" style={deptBtn(department === "education", "#185FA5", "#E6F1FB")}>
                  🔵 מנהל החינוך
                </button>
                <button onClick={() => setDepartment("youth")} type="button" style={deptBtn(department === "youth", "#D85A30", "#FAECE7")}>
                  🟠 מחלקת הנוער
                </button>
              </div>
            </Field>

            {error && <div style={errorStyle}>{error}</div>}

            <button onClick={handleRegister} disabled={!fullName || loading}
              style={{ width: "100%", marginTop: 14, padding: "11px", fontSize: 14, fontWeight: 500,
                background: fullName ? "#1A1A1A" : "var(--bg-secondary)",
                color: fullName ? "#fff" : "var(--text-tertiary)",
                border: "none", borderRadius: "var(--radius-md)",
                cursor: fullName ? "pointer" : "not-allowed" }}>
              {loading ? "שולח..." : "שלח בקשה ←"}
            </button>
            <button onClick={() => { setStep("email"); setError(""); }}
              style={{ width: "100%", marginTop: 8, padding: "8px", fontSize: 12, background: "transparent",
                border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontFamily: "inherit" }}>
              ← חזרה
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----- מסך מייל ראשי -----
  return (
    <div style={pageStyle}>
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

        <div style={cardStyle}>
          <button onClick={handleGoogleLogin} style={oauthBtn}>
            <GoogleIcon /> כניסה עם Google
          </button>
          <button onClick={handleMicrosoftLogin} style={{ ...oauthBtn, marginBottom: 16 }}>
            <MicrosoftIcon /> כניסה עם Microsoft
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
            <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>או</span>
            <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
          </div>

          <Field label="כתובת מייל">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && email && handleLogin()}
              placeholder="your.name@gmail.com" style={inputStyle} />
          </Field>

          {error && <div style={errorStyle}>{error}</div>}

          <button onClick={handleLogin} disabled={!email || loading}
            style={{ width: "100%", marginTop: 14, padding: "11px", fontSize: 14, fontWeight: 500,
              background: email ? "#1A1A1A" : "var(--bg-secondary)",
              color: email ? "#fff" : "var(--text-tertiary)",
              border: "none", borderRadius: "var(--radius-md)",
              cursor: email ? "pointer" : "not-allowed" }}>
            {loading ? "בודק..." : "כניסה / הרשמה ←"}
          </button>

          <p style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 12 }}>
            עובד חדש? פשוט הקלד את המייל ותתבקש להזין פרטים
          </p>
        </div>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="/luach" style={{ fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none" }}>
            תושב? לחץ כאן ללוח האירועים הציבורי
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
const oauthBtn: React.CSSProperties = {
  width: "100%", padding: "11px", fontSize: 14,
  background: "#fff", color: "var(--text-primary)",
  border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  gap: 10, marginBottom: 8, fontFamily: "inherit",
};
const deptBtn = (active: boolean, primary: string, light: string): React.CSSProperties => ({
  padding: "12px 10px", fontSize: 13, fontFamily: "inherit", textAlign: "center",
  borderRadius: "var(--radius-md)",
  border: active ? `2px solid ${primary}` : "0.5px solid var(--border)",
  background: active ? light : "#fff",
  color: active ? primary : "var(--text-primary)",
  fontWeight: active ? 500 : 400,
  cursor: "pointer",
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

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
function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21">
      <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
      <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginContent /></Suspense>;
}
